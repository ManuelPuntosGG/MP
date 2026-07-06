import logging
import threading
import requests
from django.core.cache import cache

logger = logging.getLogger(__name__)

TASA_CACHE_KEY = 'tasa_usdt_ves'
TASA_CACHE_TTL = 3600          # 1 hora de vigencia fresca
TASA_STALE_TTL = 86400         # 24 horas de vigencia de respaldo (stale)
TASA_UPDATING_TTL = 60         # 1 minuto de bloqueo para hilos duplicados
FACTOR_AJUSTE_BCV = 1.13
TASA_FALLBACK = 760.00

_tasa_lock = threading.Lock()


def _fetch_tasa_binance_p2p():
    """Obtiene la tasa promedio de los primeros 10 anuncios de compra de USDT/VES en Binance P2P."""
    url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
    payload = {
        "asset": "USDT",
        "fiat": "VES",
        "merchantCheck": False,
        "page": 1,
        "payTypes": [],
        "publisherType": None,
        "rows": 10,
        "tradeType": "BUY"
    }
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    response = requests.post(url, json=payload, headers=headers, timeout=5)
    response.raise_for_status()

    res_json = response.json()
    ads = res_json.get('data', [])
    if not ads:
        raise ValueError("No se obtuvieron anuncios de Binance P2P")

    prices = [float(ad['adv']['price']) for ad in ads if 'adv' in ad and 'price' in ad['adv']]
    if not prices:
        raise ValueError("No se encontraron precios en los anuncios de Binance P2P")

    promedio = sum(prices) / len(prices)
    return round(promedio, 2)


def _fetch_tasa_bcv():
    """Obtiene la tasa oficial BCV y aplica factor de ajuste."""
    url = "https://open.er-api.com/v6/latest/USD"
    response = requests.get(url, timeout=5)
    response.raise_for_status()

    data = response.json()
    tasa_bcv = float(data['rates']['VES'])
    return round(tasa_bcv * FACTOR_AJUSTE_BCV, 2)


def _actualizar_tasa_async():
    """Ejecuta la actualización de la tasa de cambio en un hilo secundario daemon."""
    def run():
        with _tasa_lock:
            # Doble check de cache fresco
            tasa = cache.get(TASA_CACHE_KEY)
            if tasa:
                return

            fuentes = [
                ('Binance P2P', _fetch_tasa_binance_p2p),
                ('ExchangeRate-API', _fetch_tasa_bcv),
            ]

            for nombre, fetch_fn in fuentes:
                try:
                    precio = fetch_fn()
                    cache.set(TASA_CACHE_KEY, precio, TASA_CACHE_TTL)
                    cache.set(f"{TASA_CACHE_KEY}_stale", precio, TASA_STALE_TTL)
                    logger.info("Tasa de cambio actualizada asíncronamente vía %s: %s VES/USDT", nombre, precio)
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


def obtener_tasa_binance():
    """Obtiene la tasa de cambio USD/VE utilizando el patrón Stale-While-Revalidate asíncrono."""
    tasa = cache.get(TASA_CACHE_KEY)
    if tasa:
        return tasa

    stale_tasa = cache.get(f"{TASA_CACHE_KEY}_stale")

    updating_flag = f"{TASA_CACHE_KEY}_updating"
    if not cache.get(updating_flag):
        cache.set(updating_flag, True, TASA_UPDATING_TTL)
        _actualizar_tasa_async()

    return stale_tasa or TASA_FALLBACK
