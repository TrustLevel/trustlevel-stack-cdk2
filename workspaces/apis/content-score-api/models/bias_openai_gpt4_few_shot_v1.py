from typing import Dict, Any, List
import logging

from langchain_core.pydantic_v1 import BaseModel, Field, validator
from langchain_openai import ChatOpenAI
from langchain.output_parsers.openai_tools import PydanticToolsParser
from langchain_core.prompts.few_shot import FewShotPromptTemplate
from langchain_core.prompts.prompt import PromptTemplate

logger = logging.getLogger(__name__)


class IndexableBaseModel(BaseModel):
    """Allows a BaseModel to return its fields by string variable indexing"""

    def __getitem__(self, item):
        return getattr(self, item)


class BiasScore(IndexableBaseModel):
    bias: float = Field(
        description="The bias score ranges from 0.0 (very biased) to 1.0 (unbiased)"
    )

    analysis: List[str] = Field(
        description="A few bullet points of catchwords summarizing the bias analysis"
    )

    @validator("bias")
    def score_is_in_range(cls, field):
        if not (field >= -1.0 and field <= 1.0):
            raise ValueError(f"score '{field}' is not in range!")
        return field


class BiasOpenAIGPT4FewShotV1:
    """BiasOpenAIGPT4 determines the bias score of a text using prompting."""

    examples = [
        {
            "rating": "0.1 (Highly Biased)",
            "article": """
            Title: "Unparalleled Genius: The Unquestionable Success of the Current Administration"
            Text: "Under the flawless leadership of President Smith, the nation has witnessed unprecedented growth and prosperity. Unlike the disastrous policies of the previous administration, President Smith’s wise decisions have catapulted our economy to new heights. Critics, blinded by bias and envy, fail to recognize the clear superiority of his strategies."
            """,
            "explanation": """This article receives a low rating due to its use of highly subjective language ("unparalleled genius," "flawless leadership") and the lack of critical examination or inclusion of diverse viewpoints. It dismisses critics without consideration of their arguments, indicating a strong, one-sided bias.""",
        },
        {
            "rating": "0.3 (Significantly Biased)",
            "article": """
            Title: "Economic Strategies of President Smith: A Major Improvement"
            Text: "President Smith’s economic strategies have proven to be more effective than those of his predecessor, leading to a significant boost in market confidence. While some argue that not all metrics have improved, the overall economic health has undeniably benefited under his leadership."
            """,
            "explanation": """This article shows bias through selective presentation of facts and omission of key opposing viewpoints. It acknowledges some criticism but quickly downplays it, presenting a predominantly positive view that favors President Smith.""",
        },
        {
            "rating": "0.5 (Moderately Biased)",
            "article": """
            Title: "Mixed Reviews on President Smith’s Economic Policies"
            Text: "President Smith’s economic policies have been met with mixed reviews. Supporters point to increased market confidence and job growth, while detractors highlight areas of concern such as income inequality and underemployment. Both sides make compelling arguments about the effectiveness of his policies."
            """,
            "explanation": """This article strikes a balance by presenting both supporting and opposing views but still leans slightly towards a positive tone in its emphasis on successes. The moderate bias is evident in the more favorable presentation of supporting arguments.""",
        },
        {
            "rating": "0.7 (Slightly Biased)",
            "article": """
            Title: "Assessing the Impact of President Smith’s Economic Policies"
            Text: "An analysis of President Smith’s economic policies reveals a complex picture. Data shows improvements in job growth and market confidence, yet challenges like income inequality persist. Experts from various fields provide diverse insights into these mixed outcomes."
            """,
            "explanation": """The article presents a balanced analysis by discussing both improvements and ongoing challenges. It shows slight bias through its structuring of information, possibly giving more emphasis to positive outcomes in the placement and depth of analysis.""",
        },
        {
            "rating": "0.9 (Highly Unbiased)",
            "article": """
            Title: "Comprehensive Review of Economic Policies Under President Smith"
            Text: "This comprehensive review examines the economic policies of President Smith, incorporating a wide range of data sources and expert opinions. It explores improvements in job growth and market confidence, alongside persistent challenges such as income inequality and inflation. The review includes perspectives from economists across the political spectrum, providing a well-rounded discussion of the impacts."
            """,
            "explanation": """This article achieves a high rating for unbiased reporting by thoroughly presenting diverse perspectives and a wide range of data. It makes an effort to equally weigh each viewpoint and avoids using subjective language, allowing readers to form their own opinions based on a balanced presentation of facts.""",
        },
    ]

    def __init__(self):
        tools = [BiasScore]
        model = ChatOpenAI(temperature=0, model="gpt-4-turbo").bind_tools(tools)

        example_prompt = PromptTemplate(
            input_variables=["rating", "article", "explanation"],
            template="Article: {article}\nExplanation: {explanation}\nbias_score: {rating}",
        )

        prompt = FewShotPromptTemplate(
            examples=self.examples,
            example_prompt=example_prompt,
            suffix="How would you rate this text: {input}",
            input_variables=["input"],
        )

        parser = PydanticToolsParser(tools=tools)

        self.chain = prompt | model | parser

    def analyze_text(self, text: str, config: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("perform analysis")
        result: BiasScore = self.chain.invoke({"input": f'"""{text}"""'})

        logger.info("result: %s", result)

        return {
            "score": 2 * result[0].bias - 1,
            "details": dict(result[0]),
        }
