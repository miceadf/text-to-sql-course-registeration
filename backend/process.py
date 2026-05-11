import time

from .llm import generate_sql, fix_sql
from .validator import validate_sql, enforce_limit
from .db import run_query
from .utils import log_query
from .redis_cache import get_cache, set_cache

def process(query):
    started_total = time.perf_counter()
    timings = {
        "cache_lookup_ms": 0,
        "llm_ms": 0,
        "validate_ms": 0,
        "db_ms": 0,
        "total_ms": 0,
    }

    t0 = time.perf_counter()
    cached = get_cache(query)
    timings["cache_lookup_ms"] = int((time.perf_counter() - t0) * 1000)
    if cached:
        cached["cache_hit"] = True
        cached["timings_ms"] = {
            "cache_lookup_ms": timings["cache_lookup_ms"],
            "llm_ms": 0,
            "validate_ms": 0,
            "db_ms": 0,
            "total_ms": int((time.perf_counter() - started_total) * 1000),
        }
        return cached

    sql = None

    try:
        t_llm = time.perf_counter()
        sql = generate_sql(query)
        timings["llm_ms"] = int((time.perf_counter() - t_llm) * 1000)

        if not sql or sql == "UNKNOWN":
            return {"error": "질문이 모호합니다"}

        t_val = time.perf_counter()
        validate_sql(sql)
        sql = enforce_limit(sql)
        timings["validate_ms"] = int((time.perf_counter() - t_val) * 1000)

        try:
            t_db = time.perf_counter()
            result = run_query(sql)
            timings["db_ms"] = int((time.perf_counter() - t_db) * 1000)
        except RuntimeError as db_err:
            if "DATABASE_URL is not set" in str(db_err):
                timings["total_ms"] = int((time.perf_counter() - started_total) * 1000)
                res = {
                    "sql": sql,
                    "data": [],
                    "warning": "DATABASE_URL is not set. SQL only mode is active.",
                    "cache_hit": False,
                    "timings_ms": timings,
                }
                set_cache(query, res)
                log_query(query, sql, True)
                return res
            raise

        timings["total_ms"] = int((time.perf_counter() - started_total) * 1000)
        res = {"sql": sql, "data": result, "cache_hit": False, "timings_ms": timings}

        set_cache(query, res)
        log_query(query, sql, True)

        return res

    except Exception as e:
        # If we couldn't even generate an initial SQL, surface the error clearly.
        if not sql:
            log_query(query, "", False)
            return {"error": str(e)}

        try:
            t_fix = time.perf_counter()
            fixed = fix_sql(query, sql, str(e))
            timings["llm_ms"] += int((time.perf_counter() - t_fix) * 1000)

            t_val = time.perf_counter()
            validate_sql(fixed)
            fixed = enforce_limit(fixed)
            timings["validate_ms"] += int((time.perf_counter() - t_val) * 1000)

            try:
                t_db = time.perf_counter()
                result = run_query(fixed)
                timings["db_ms"] += int((time.perf_counter() - t_db) * 1000)
            except RuntimeError as db_err:
                if "DATABASE_URL is not set" in str(db_err):
                    timings["total_ms"] = int((time.perf_counter() - started_total) * 1000)
                    res = {
                        "sql": fixed,
                        "data": [],
                        "warning": "DATABASE_URL is not set. SQL only mode is active.",
                        "cache_hit": False,
                        "timings_ms": timings,
                    }
                    set_cache(query, res)
                    log_query(query, fixed, True)
                    return res
                raise

            timings["total_ms"] = int((time.perf_counter() - started_total) * 1000)
            return {"sql": fixed, "data": result, "cache_hit": False, "timings_ms": timings}

        except Exception as e2:
            log_query(query, sql, False)
            return {"error": str(e2)}
