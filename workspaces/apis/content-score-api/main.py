import os
import models
import logging
import trustlevel as tl

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from pydantic import BaseModel
from openai import OpenAI
from typing import Dict, Any, List


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info("Starting content-score-api")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "[http://localhost:8080]")

app = FastAPI()


# remove the brackets from the string
origins = ALLOWED_ORIGINS[1:-1].split(",")

logger.info("Add CORS middleware with origins: %s", origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins="*",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class Request(BaseModel):
    text: str
    config: tl.Config = None


class Metadata(BaseModel):
    config: tl.Config
    scores: Dict[str, Dict[str, Any]]


class Response(BaseModel):
    trustlevel: float
    explanations: List[str] = None
    metadata: Metadata = None


client = OpenAI()


# TODO: initialize OpenAI client and pass it to the models
modelsDict = {
    tl.ModelType.polarity_openai_gpt3_5_v1: models.PolarityOpenAIGPT35V1(client),
    tl.ModelType.objectivity_openai_gpt3_5_v1: models.ObjectivityOpenAIGPT35V1(client),
    tl.ModelType.bias_openai_gpt3_5_v0: models.BiasOpenAIGPT35V0(client),
    tl.ModelType.bias_openai_gpt3_5_v1: models.BiasOpenAIGPT35V1(),
    tl.ModelType.bias_openai_gpt3_5_v2: models.BiasOpenAIGPT35V2(),
    tl.ModelType.trustlevel_openai_gpt3_5_v1: models.TrustLevelOpenAIGPT35V1(),
    tl.ModelType.trustlevel_openai_gpt3_5_v2: models.TrustLevelOpenAIGPT35V2(),
    tl.ModelType.bias_openai_gpt4_v1: models.BiasOpenAIGPT4FewShotV1(),
}

defaultModel = tl.Model(
    name=tl.ModelType.bias_openai_gpt4_v1,
    config=tl.TrustLevelConfig(
        weight=1.0,
        activation=tl.TrustLevelActivation(scaling=1.0, steepness=5.0, shift=0.1),
    ),
)


@app.post("/trustlevels")
async def root(request: Request):
    logging.info(f"Received request: {request.text}")
    config = tl.Config(models=[])
    if request.config is None:
        config.models.append(defaultModel)
    else:
        config = request.config

    result = tl.content_quality_score(request.text, config, modelsDict)

    response = Response(trustlevel=result.score, explanations=result.explanations)
    if request.config is not None:
        response.metadata = Metadata(config=config, scores=result.scores)

    return response


# This is the entry point for AWS Lambda
handler = Mangum(app, lifespan="off", api_gateway_base_path="/v1")
