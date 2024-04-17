import json
import logging
from typing import Dict, Any
from openai import OpenAI


logger = logging.getLogger(__name__)


class BiasOpenAIGPT35V0:
    """BiasOpenAIGPT35V0 determines the bias score of a text using simple prompting."""

    __client: OpenAI

    def __init__(self, client: OpenAI):
        self.__client = client

    def analyze_text(self, text: str, config: Dict[str, Any]) -> Dict[str, Any]:
        response = self.__client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": 'You will be provided with text delimited by triple quotes for which you determine the bias score ("bias_score") in the range [-1.0,1.0] where 1.0 means not biased and -1.0 means the text is very biased. You reply with a single pure JSON object only (no markdown or anything else), with the field "bias_score". Explain step by step how you came up with the score in an additional JSON object field called "chain_of_thought" but do not summarize the text.',
                },
                {"role": "user", "content": f'"""{text}"""'},
            ],
        )

        # parse the json response
        response_json = response.choices[0].message.content
        logger.info("response_json: %s", response_json)

        response_dict = json.loads(response_json)
        bias_score = response_dict["bias_score"]

        return {"score": bias_score, "details": response_dict["chain_of_thought"]}
