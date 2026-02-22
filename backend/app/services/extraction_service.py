import json
import logging
from anthropic import Anthropic
from app.config import settings

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """Eres un experto en análisis de contratos de arrendamiento comercial en México.
Analiza el siguiente texto de un contrato de arrendamiento y extrae la información en formato JSON.

IMPORTANTE:
- Si un campo no se encuentra en el texto, usa null
- Las fechas deben estar en formato YYYY-MM-DD
- Los montos deben ser números sin formato (sin comas ni signos)
- Responde SOLO con el JSON, sin texto adicional

Campos a extraer:
{
  "arrendador": "nombre completo del arrendador/propietario",
  "arrendatario": "nombre completo del arrendatario/inquilino",
  "direccion": "dirección completa del inmueble",
  "ciudad": "ciudad",
  "estado": "estado de la república",
  "codigo_postal": "código postal",
  "metros_cuadrados": número de metros cuadrados,
  "fecha_inicio": "YYYY-MM-DD",
  "fecha_vencimiento": "YYYY-MM-DD",
  "duracion_meses": número de meses de duración,
  "renta_mensual": monto numérico de la renta mensual,
  "incremento_anual": porcentaje de incremento anual (número),
  "deposito_garantia": monto del depósito en garantía,
  "moneda": "MXN" o "USD",
  "uso_permitido": "uso permitido del inmueble",
  "clausula_renovacion": "resumen de la cláusula de renovación",
  "penalizacion_terminacion_anticipada": "resumen de penalización",
  "mantenimiento_responsable": "quién es responsable del mantenimiento",
  "seguros_requeridos": "seguros requeridos",
  "fiador": "nombre del fiador si aplica",
  "notas_adicionales": "cualquier información relevante adicional"
}

TEXTO DEL CONTRATO:
"""


class ExtractionService:
    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)

    async def extract_metadata(self, contract_text: str) -> dict:
        """Extract structured metadata from contract text using Claude."""
        max_chars = 150000
        text = contract_text[:max_chars] if len(contract_text) > max_chars else contract_text

        prompt = EXTRACTION_PROMPT + text

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
            )

            response_text = message.content[0].text.strip()

            # Handle case where Claude wraps in ```json blocks
            if response_text.startswith("```"):
                response_text = response_text.split("\n", 1)[1]
                response_text = response_text.rsplit("```", 1)[0]

            metadata = json.loads(response_text)
            logger.info(f"Successfully extracted metadata: {list(metadata.keys())}")
            return metadata

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse extraction response: {e}")
            return {}
        except Exception as e:
            logger.error(f"Extraction failed: {e}")
            raise

extraction_service = ExtractionService()
