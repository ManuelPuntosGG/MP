import logging
import re
import threading
import requests
import urllib3
from django.core.cache import cache

logger = logging.getLogger(__name__)

TASA_CACHE_KEY = 'tasa_bcv_euro_ves'
TASA_CACHE_TTL = 3600          # 1 hora de vigencia fresca
TASA_STALE_TTL = 86400         # 24 horas de vigencia de respaldo (stale)
TASA_UPDATING_TTL = 60         # 1 minuto de bloqueo para hilos duplicados
TASA_FALLBACK = 1001.18        # Valor oficial de contingencia (Fecha Valor: 09/11/2026)

_tasa_lock = threading.Lock()


def _fetch_tasa_bcv_dolarvzla():
    """Obtiene la tasa oficial BCV Euro desde la API de DolarVzla."""
    url = "https://rates.dolarvzla.com/bcv/current.json"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MPTech/1.0"
    }
    response = requests.get(url, headers=headers, timeout=6)
    response.raise_for_status()

    data = response.json()
    eur = data.get('current', {}).get('eur')
    if not eur:
        raise ValueError("Campo 'eur' no presente en la respuesta de DolarVzla")

    return round(float(eur), 2)


def _fetch_tasa_bcv_dolarapi():
    """Obtiene la tasa oficial BCV Euro desde el endpoint de DolarApi Venezuela."""
    url = "https://ve.dolarapi.com/v1/euros/oficial"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MPTech/1.0"
    }
    response = requests.get(url, headers=headers, timeout=6)
    response.raise_for_status()

    data = response.json()
    promedio = data.get('promedio')
    if not promedio:
        raise ValueError("Campo 'promedio' no presente en la respuesta de DolarApi")

    return round(float(promedio), 2)


def _fetch_tasa_bcv_directo():
    """Scraping de contingencia directo al portal del Banco Central de Venezuela."""
    url = "https://www.bcv.org.ve"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    with urllib3.warnings.catch_warnings():
        urllib3.disable_warnings()
        response = requests.get(url, headers=headers, timeout=8, verify=False)
    response.raise_for_status()

    match = re.search(
        r'id=["\']euro["\'].*?<strong[^>]*>\s*([0-9.,]+)\s*</strong>',
        response.text,
        re.DOTALL | re.IGNORECASE
    )
    if not match:
        raise ValueError("No se pudo extraer la tasa EUR del HTML oficial del BCV")

    val_str = match.group(1).replace('.', '').replace(',', '.')
    return round(float(val_str), 2)


_FUENTES_BCV_EURO = [
    ('DolarVzla API (BCV EUR)', _fetch_tasa_bcv_dolarvzla),
    ('DolarApi (BCV EUR)', _fetch_tasa_bcv_dolarapi),
    ('BCV Directo (Portal Oficial)', _fetch_tasa_bcv_directo),
]


def _actualizar_tasa_async():
    """Ejecuta la actualización de la tasa de cambio en un hilo secundario daemon."""
    def run():
        with _tasa_lock:
            # Doble check de cache fresco
            tasa = cache.get(TASA_CACHE_KEY)
            if tasa:
                return

            for nombre, fetch_fn in _FUENTES_BCV_EURO:
                try:
                    precio = fetch_fn()
                    cache.set(TASA_CACHE_KEY, precio, TASA_CACHE_TTL)
                    cache.set(f"{TASA_CACHE_KEY}_stale", precio, TASA_STALE_TTL)
                    logger.info("Tasa BCV Euro actualizada asíncronamente vía %s: %s VES", nombre, precio)
                    return
                except Exception as e:
                    logger.warning("Fallo en obtención de tasa vía %s: %s", nombre, e)

            # Si todas fallaron, extendemos la vida de la tasa stale para no reintentar
            # en cada renderización de página web por los próximos 5 minutos.
            stale = cache.get(f"{TASA_CACHE_KEY}_stale")
            if stale:
                cache.set(TASA_CACHE_KEY, stale, 300)
            else:
                cache.set(TASA_CACHE_KEY, TASA_FALLBACK, 300)

    threading.Thread(target=run, daemon=True).start()


def obtener_tasa_bcv_euro():
    """
    Obtiene la tasa de referencia BCV Euro en Bolívares (VES)
    utilizando el patrón Stale-While-Revalidate asíncrono con múltiples fuentes de respaldo.
    """
    tasa = cache.get(TASA_CACHE_KEY)
    if tasa:
        return tasa

    stale_tasa = cache.get(f"{TASA_CACHE_KEY}_stale")

    # Si no hay tasa fresca ni stale en caché (inicio en frío del servidor),
    # realizamos una actualización síncrona en este hilo para evitar retornar el fallback estático.
    if not stale_tasa:
        for nombre, fetch_fn in _FUENTES_BCV_EURO:
            try:
                precio = fetch_fn()
                cache.set(TASA_CACHE_KEY, precio, TASA_CACHE_TTL)
                cache.set(f"{TASA_CACHE_KEY}_stale", precio, TASA_STALE_TTL)
                logger.info("Tasa BCV Euro inicial obtenida síncronamente vía %s: %s VES", nombre, precio)
                return precio
            except Exception as e:
                logger.warning("Fallo síncrono al obtener tasa vía %s: %s", nombre, e)
        return TASA_FALLBACK

    # Si hay tasa stale disponible, iniciamos la actualización asíncrona de fondo y la retornamos de inmediato.
    updating_flag = f"{TASA_CACHE_KEY}_updating"
    if not cache.get(updating_flag):
        cache.set(updating_flag, True, TASA_UPDATING_TTL)
        _actualizar_tasa_async()

    return stale_tasa


# Alias de retrocompatibilidad para llamadas existentes en el proyecto
obtener_tasa_binance = obtener_tasa_bcv_euro
