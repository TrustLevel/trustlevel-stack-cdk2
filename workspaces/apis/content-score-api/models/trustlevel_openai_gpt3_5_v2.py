from typing import Dict, Any, List
import logging

from langchain_core.utils.function_calling import (
    convert_to_openai_function,
)
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.pydantic_v1 import BaseModel, Field, validator
from langchain_openai import ChatOpenAI
from langchain.output_parsers.openai_functions import PydanticOutputFunctionsParser

logger = logging.getLogger(__name__)


class Objectivity(BaseModel):
    """Focus: Facts over feelings. Look for balanced presentation and neutral language."""

    emotional_language: float = Field(
        description="Score in range [-1.0, 1.0] scoring if the article is heavily reliant on words that evoke strong emotions (fear, anger, excitement) rather than presenting facts? -1.0 means emotional language and 1.0 means factual language."
    )

    emotional_language_explain: List[str] = Field(
        description="Explain the emotional_language score in detail by providing examples from the text."
    )

    loaded_language: float = Field(
        description="Score in range [-1.0, 1.0] scoring if the article uses loaded language. Where the score -1.0 means the article uses words with strong connotations that favor a particular viewpoint and 1.0 means the article is well balanced."
    )

    loaded_language_explain: List[str] = Field(
        description="Explain the loaded_language score in detail by providing examples from the text."
    )

    bias: float = Field(
        description="Score in range [-1.0, 1.0] scoring if the language seem slanted towards a particular perspective.  Look for phrases that seem to judge or push an agenda. Where the score -1.0 means the article uses biased language and 1.0 means it's not using biased language."
    )

    bias_explain: List[str] = Field(
        description="Explain the bias score in detail by providing examples from the text."
    )

    @validator("emotional_language", "loaded_language", "bias")
    def score_is_in_range(cls, field):
        if not (field >= -1.0 and field <= 1.0):
            raise ValueError(f"score '{field}' is not in range!")
        return field


class StructureTone(BaseModel):
    """Clarity: Well-constructed sentences, professional tone. Avoid sensationalism and informality."""

    sentence_structure: float = Field(
        description="Score in range [-1.0, 1.0] scoring if the sentences complex and well-constructed, or are they short, choppy, and filled with exclamation points? Where the score -1.0 means bad structured sentences and 1.0 means the sentences are well structured."
    )

    sentence_structure_explain: List[str] = Field(
        description="Explain the sentence_structure score in detail by providing examples from the text."
    )

    formality: float = Field(
        description="Score in range [-1.0, 1.0] scoring if the tone is formal and professional, or if it is informal, conversational, or even sensationalized? Where the score -1.0 means the article uses professional language and 1.0 means it uses informal, conversational, or even sensationalized language."
    )

    formality_explain: List[str] = Field(
        description="Explain the formality score in detail by providing examples from the text."
    )

    @validator("sentence_structure", "formality")
    def score_is_in_range(cls, field):
        if not (field >= -1.0 and field <= 1.0):
            raise ValueError(f"score '{field}' is not in range!")
        return field


class WordChoice(BaseModel):
    """Specificity: Clear, specific details with evidence to back claims. Avoid vagueness and generalizations."""

    specificity: float = Field(
        description="Score in range [-1.0, 1.0]. Where the score -1.0 means the article relies on generalizations and vague terms and 1.0 means the article uses specific details and clear language."
    )

    specificity_explain: List[str] = Field(
        description="Explain the specificity score in detail by providing examples from the text."
    )

    evidence: float = Field(
        description="Score in range [-1.0, 1.0]. Where the score -1.0 means the article makes assertions without evidence and 1.0 means the article use quotes to support claims."
    )

    evidence_explain: List[str] = Field(
        description="Explain the evidence score in detail by providing examples from the text."
    )

    @validator("specificity", "evidence")
    def score_is_in_range(cls, field):
        if not (field >= -1.0 and field <= 1.0):
            raise ValueError(f"score '{field}' is not in range!")
        return field


class HeadlinesSubheadings(BaseModel):
    """Accuracy: Reflect the article's content accurately, not exaggerated or misleading."""

    accuracy: float = Field(
        description="Score in range [-1.0, 1.0]. Where the score -1.0 means the article uses headlines and subheadings that are exaggerated or misleading and 1.0 means the article uses headlines and subheadings accurately reflect the content of the article."
    )

    accuracy_explain: List[str] = Field(
        description="Explain the accuracy score in detail by providing examples from the text."
    )

    sensationalism: float = Field(
        description="Score in range [-1.0, 1.0]. Where the score -1.0 means the article uses dramatic or provocative language to grab attention and 1.0 means the article rather informs."
    )

    sensationalism_explain: List[str] = Field(
        description="Explain the sensationalism score in detail by providing examples from the text."
    )

    @validator("sensationalism", "accuracy")
    def score_is_in_range(cls, field):
        if not (field >= -1.0 and field <= 1.0):
            raise ValueError(f"score '{field}' is not in range!")
        return field


class TrustLevelV2Response(BaseModel):
    """TrustLevelResponse determening the trustlevel score of a text."""

    objectivity_score: Objectivity = Field(
        description="Scores for Focus: Facts over feelings. Look for balanced presentation and neutral language."
    )

    structure_tone_score: StructureTone = Field(
        description="Scores for Clarity: Well-constructed sentences, professional tone. Avoid sensationalism and informality."
    )

    word_choice_score: WordChoice = Field(
        description="Scores for Specificity: Clear, specific details with evidence to back claims. Avoid vagueness and generalizations."
    )

    headlines_subheadings_score: HeadlinesSubheadings = Field(
        description="Scores for Accuracy: Reflect the article's content accurately, not exaggerated or misleading."
    )


class TrustLevelOpenAIGPT35V2:
    """TrustLevelOpenAIGPT35V1 determines the trustlevel score of a text using simple prompting."""

    __weights = {
        "objectivity": {
            "weight": 0.4,
            "emotional_language": 0.1,
            "loaded_language": 0.1,
            "bias": 0.2,
        },
        "structure_tone": {
            "weight": 0.25,
            "sentence_structure": 0.1,
            "formality": 0.15,
        },
        "word_choice": {
            "weight": 0.2,
            "specificity": 0.1,
            "evidence": 0.1,
        },
        "headlines_subheadings": {
            "weight": 0.15,
            "accuracy": 0.1,
            "sensationalism": 0.05,
        },
    }

    def __init__(self):
        model = ChatOpenAI(temperature=0)

        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You will be provided with news articles delimited by triple quotes. Analyze the given article and asses the quality of the news article in terms of its trustworthiness.",
                ),
                ("user", "{input}"),
            ]
        )

        parser = PydanticOutputFunctionsParser(pydantic_schema=TrustLevelV2Response)

        openai_functions = [convert_to_openai_function(TrustLevelV2Response)]
        self.chain = prompt | model.bind(functions=openai_functions) | parser

    def analyze_text(self, text: str, config: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("prompts: %s", self.chain.get_prompts())
        result: TrustLevelV2Response = self.chain.invoke({"input": f'"""{text}"""'})

        logger.info("result: %s", result)
        objectivity_score = (
            (
                result.objectivity_score.emotional_language
                * self.__weights["objectivity"]["emotional_language"]
            )
            + (
                result.objectivity_score.loaded_language
                * self.__weights["objectivity"]["loaded_language"]
            )
            + (result.objectivity_score.bias * self.__weights["objectivity"]["bias"])
        ) / 3.0
        structure_tone_score = (
            (
                result.structure_tone_score.sentence_structure
                * self.__weights["structure_tone"]["sentence_structure"]
            )
            + (
                result.structure_tone_score.formality
                * self.__weights["structure_tone"]["formality"]
            )
        ) / 2.0
        word_choice_score = (
            (
                result.word_choice_score.specificity
                * self.__weights["word_choice"]["specificity"]
            )
            + (
                result.word_choice_score.evidence
                * self.__weights["word_choice"]["evidence"]
            )
        ) / 2.0
        headlines_subheadings_score = (
            (
                result.headlines_subheadings_score.accuracy
                * self.__weights["headlines_subheadings"]["accuracy"]
            )
            + (
                result.headlines_subheadings_score.sensationalism
                * self.__weights["headlines_subheadings"]["sensationalism"]
            )
        ) / 2.0
        logger.warning("this model does not yet support explanations")
        return {
            "score": (
                (objectivity_score * self.__weights["objectivity"]["weight"])
                + (structure_tone_score * self.__weights["structure_tone"]["weight"])
                + (word_choice_score * self.__weights["word_choice"]["weight"])
                + (
                    headlines_subheadings_score
                    * self.__weights["headlines_subheadings"]["weight"]
                )
            ),
            "details": result.dict(),
            "explanations": [],
        }
