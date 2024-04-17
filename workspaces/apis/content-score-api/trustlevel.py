import math

from enum import Enum
from pydantic import BaseModel
from typing import List, Protocol, Dict, Any
from typing_extensions import TypedDict


# should be in main.py because the content qulity score shouldn't know about the models
# but this way pydantic can validate the model name
class ModelType(str, Enum):
    polarity_openai_gpt3_5_v1 = "polarity/openai/gpt-3.5-v1"
    # polarity_spacytextblob = "polarity/spacytextblob"
    objectivity_openai_gpt3_5_v1 = "objectivity/openai/gpt-3.5-v1"
    # objectivity_spacytextblob = "objectivity/spacytextblob"
    bias_openai_gpt3_5_v0 = "bias/openai/gpt-3.5-v0"
    bias_openai_gpt3_5_v1 = "bias/openai/gpt-3.5-v1"
    bias_openai_gpt3_5_v2 = "bias/openai/gpt-3.5-v2"
    # bias_d4data = "bias/d4data"
    trustlevel_openai_gpt3_5_v1 = "trustlevel/openai/gpt-3.5-v1"


class TrustLevelActivation(BaseModel):
    scaling: float = 1.0
    steepness: float = 5.0
    shift: float = 0.1


class TrustLevelConfig(BaseModel):
    weight: float = 1.0
    model: Dict[str, Any] = None
    activation: TrustLevelActivation


class Model(BaseModel):
    name: ModelType
    config: TrustLevelConfig


class Config(BaseModel):
    models: List[Model]


class ModelScore(TypedDict):
    raw: float
    scaled: float
    details: Any


class ContentQuality(BaseModel):
    score: float
    model_scores: Dict[str, ModelScore]


class TextAnalyzerResponse(BaseModel):
    score: float
    details: Any = None


class TextAnalyzer(Protocol):
    def analyze_text(self, text: str, config: Dict[str, Any]) -> TextAnalyzerResponse:
        """A TextAnalyzer protocol"""
        ...


def content_quality_score(
    text: str, config: Config, models: Dict[str, TextAnalyzer]
) -> ContentQuality:
    score = 0.0
    model_scores = {}
    for model in config.models:
        if model.name in models:
            result = models[model.name].analyze_text(text, model.config.model)

            result = TextAnalyzerResponse.model_validate(result)
            model_score = result.score
            scaled_score = sigmoid(model_score, model.config.activation)
            model_scores[model.name] = ModelScore(
                raw=model_score, scaled=scaled_score, details=result.details
            )

            score += model.config.weight * scaled_score
        else:
            raise ValueError(f"Unknown model {model.name}")
    return ContentQuality(score=score, model_scores=model_scores)


def sigmoid(x: float, config: TrustLevelActivation) -> float:
    """
    Convert bias score [-1.0, 1.0] to [0.0, 1.0] with s-shaped sigmoid function to favor non-biased content.

    Args:
        x (float): The input value in the range [-1.0, 1.0].
        config (TrustLevelActivation): The configuration object containing the scaling, steepness, and shift values.

    Returns:
        float: The sigmoid function value.

    """
    return config.scaling / (1.0 + math.exp(-config.steepness * (x - config.shift)))
