"""Disable optional Chroma product telemetry for this local application."""
from chromadb.telemetry.product import ProductTelemetryClient, ProductTelemetryEvent
from overrides import override


class DisabledTelemetry(ProductTelemetryClient):
    @override
    def capture(self, event: ProductTelemetryEvent) -> None:
        pass
