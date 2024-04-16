from typing import Dict, Any

from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.pydantic_v1 import BaseModel, Field, validator
from langchain_openai import ChatOpenAI

model = ChatOpenAI(temperature=0)


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


parser = JsonOutputParser(pydantic_object=BiasResponse)

prompt = PromptTemplate(
    template="You will be provided with text delimited by triple quotes for which you determine the bias score.\n{format_instructions}\n{input}\n",
    input_variables=["input"],
    partial_variables={"format_instructions": parser.get_format_instructions()},
)

chain = prompt | model | parser


class BiasOpenAIGPT35V1:
    def analyze_text(self, text: str, config: Dict[str, Any]) -> Dict[str, Any]:
        response = chain.invoke({"input": text})

        print("V1 RESULT", response)

        return {
            "score": response["bias_score"],
            "details": response["chain_of_thought"],
        }
