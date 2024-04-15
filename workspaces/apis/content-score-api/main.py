import trustlevel as tl
import models

from fastapi import FastAPI
from mangum import Mangum
from pydantic import BaseModel
from typing import Dict


app = FastAPI()


class Request(BaseModel):
    text: str
    config: tl.Config = None


class Metadata(BaseModel):
    config: tl.Config
    model_scores: Dict[str, Dict[str, float]]


class Response(BaseModel):
    trustlevel: float
    metadata: Metadata = None


modelsDict = {tl.ModelType.bias_openai_gpt3_5_v1: models.BiasOpenAIGPT35V1()}

defaultModel = tl.Model(
    name=tl.ModelType.bias_openai_gpt3_5_v1,
    config=tl.TrustLevelConfig(
        weight=1.0,
        activation=tl.TrustLevelActivation(scaling=1.0, steepness=5.0, shift=0.1),
    ),
)


@app.post("/")
async def root(request: Request):
    print("request.config", request.config)
    config = tl.Config(models=[])
    if request.config is None:
        config.models.append(defaultModel)
    else:
        config = request.config

    result = tl.content_quality_score(request.text, config, modelsDict)

    response = Response(trustlevel=result.score)
    if request.config is not None:
        response.metadata = Metadata(config=config, model_scores=result.model_scores)

    return response


# This is the entry point for AWS Lambda
handler = Mangum(app, lifespan="off")
