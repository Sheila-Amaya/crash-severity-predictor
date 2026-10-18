import logging

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    """
    Register global exception handlers.
    """

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request,
        exc: StarletteHTTPException
    ):
        if exc.status_code >= 500:
            logger.error(
                "%s %s -> %s",
                request.method,
                request.url.path,
                exc.detail
            )
        else:
            logger.warning(
                "%s %s -> %s",
                request.method,
                request.url.path,
                exc.detail
            )

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.detail
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError
    ):
        # En el registro solo el campo y el tipo de error: exc.errors() trae
        # también los valores recibidos (el cuerpo de la petición)
        logger.warning(
            "Validation error on %s %s: %s",
            request.method,
            request.url.path,
            [(".".join(map(str, e.get("loc", ()))), e.get("type")) for e in exc.errors()]
        )

        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "message": "Validation error",
                # ctx.error puede traer la excepción (ValueError) de un validador
                "errors": jsonable_encoder(exc.errors(), custom_encoder={Exception: str})
            }
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(
        request: Request,
        exc: Exception
    ):
        logger.exception(
            "Unhandled exception on %s %s",
            request.method,
            request.url.path
        )

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Internal server error"
            }
        )