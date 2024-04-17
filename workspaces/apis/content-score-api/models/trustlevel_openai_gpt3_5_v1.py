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


class TrustLevelResponse(BaseModel):
    """TrustLevelResponse determening the trustlevel score of a text."""

    language_sore: float = Field(
        description="Score in range [-1.0, 1.0] scoring the neutral language (unbiased) of the article. Look for emotional language, superlatives, or adjectives that might indicate a bias. Where the score -1.0 means not neutral and 1.0 means neutral language."
    )

    language_explain: List[str] = Field(
        description="Explain the language score in detail by providing examples from the text."
    )

    source_and_facts: float = Field(
        description="Score in range [-1.0, 1.0] scoring if the article cites trustworthy sources. Check the diversity and credibility of the sources mentioned. Furthermore, the presence of verifiable facts and data supports objectivity. Do assess the article's reliance on facts versus opinions.  Where the score -1.0 means low quality and 1.0 means high quality."
        # description="Check if the article cite trustworthy sources. Check the diversity and credibility of the sources mentioned. Furthermore, the presence of verifiable facts and data supports objectivity. Do assess the article's reliance on facts versus opinions. The score is in the range [-1.0, 1.0] where -1.0 represent low quality and 1.0 represents a hight quality."
    )

    source_and_facts_explain: List[str] = Field(
        description="Explain the source and facts score in detail by providing examples from the text."
    )

    balance: float = Field(
        description="Score in range [-1.0, 1.0] scoring if the article is balanced and presents multiple viewpoints on a subject. Look for evidence of the article considering different perspectives. Where the score -1.0 means unbalanced article and 1.0 means well balanced article."
        # description="Check if the article is balanced and presents multiple viewpoints on a subject. Look for evidence of the article considering different perspectives. The score is in the range [-1.0, 1.0] where -1.0 represents an unbalanced article and 1.0 represents a well balanced article."
    )

    balance_explain: List[str] = Field(
        description="Explain the balance score in detail by providing examples from the text."
    )

    chain_of_thought: str = Field(
        description="Explain step by step how you came up with the score but do not summarize the text"
    )

    @validator("language_sore", "source_and_facts", "balance")
    def score_is_in_range(cls, field):
        if not (field >= -1.0 and field <= 1.0):
            raise ValueError(f"score '{field}' is not in range!")
        return field


class TrustLevelOpenAIGPT35V1:
    """TrustLevelOpenAIGPT35V1 determines the trustlevel score of a text using simple prompting."""

    __weights = {
        "language_sore": 1,
        "source_and_facts": 0.1,
        "balance": 0.5,
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

        parser = PydanticOutputFunctionsParser(pydantic_schema=TrustLevelResponse)

        openai_functions = [convert_to_openai_function(TrustLevelResponse)]
        self.chain = prompt | model.bind(functions=openai_functions) | parser

    def analyze_text(self, text: str, config: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("prompts: %s", self.chain.get_prompts())
        result: TrustLevelResponse = self.chain.invoke({"input": f'"""{text}"""'})

        logger.info("result: %s", result)
        return {
            "score": (
                (result.language_sore * self.__weights["language_sore"])
                + (result.source_and_facts * self.__weights["source_and_facts"])
                + (result.balance * self.__weights["balance"])
            )
            / 3.0,
            "details": result.dict(),
        }
