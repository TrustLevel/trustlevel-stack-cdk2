from typing import Dict, Any

from langchain_community.utils.openai_functions import (
    convert_pydantic_to_openai_function,
)
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.pydantic_v1 import BaseModel, Field, validator
from langchain_openai import ChatOpenAI
from langchain.output_parsers.openai_functions import PydanticOutputFunctionsParser


class BiasResponse(BaseModel):
    """BiasResponse determening the bias score of a text."""

    bias_score: float = Field(
        description="bias score in the range [-1.0,1.0] where 1.0 means not biased and -1.0 means the text is very biased"
    )
    chain_of_thought: str = Field(
        description="Explain step by step how you came up with the score but do not summarize the text"
    )

    # You can add custom validation logic easily with Pydantic.
    @validator("bias_score")
    def bias_score_is_in_range(cls, field):
        if not (field >= -1.0 and field <= 1.0):
            raise ValueError("Bias score is not in range!")
        return field


model = ChatOpenAI(temperature=0)

prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You will be provided with text delimited by triple quotes for which you determine the bias score",
        ),
        ("user", "{input}"),
    ]
)

parser = PydanticOutputFunctionsParser(pydantic_schema=BiasResponse)


openai_functions = [convert_pydantic_to_openai_function(BiasResponse)]
chain = prompt | model.bind(functions=openai_functions) | parser


class BiasOpenAIGPT35V2:
    def analyze_text(self, text: str, config: Dict[str, Any]) -> Dict[str, Any]:
        result: BiasResponse = chain.invoke({"input": f'"""{text}"""'})

        return {
            "score": result.bias_score,
            "details": result.chain_of_thought,
        }
