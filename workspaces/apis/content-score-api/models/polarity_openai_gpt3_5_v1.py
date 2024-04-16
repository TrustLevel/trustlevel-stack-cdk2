import json
from typing import Dict, Any
from openai import OpenAI

client = OpenAI()


class PolarityOpenAIGPT35V1:
    """PolarityOpenAIGPT35V1 determines the polarity score of a text using simple prompting."""

    def analyze_text(self, text: str, config: Dict[str, Any]) -> Dict[str, Any]:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": 'You will be provided with text delimited by triple quotes for which you determine the polarity score ("polarity") in the range [-1.0,1.0] where 1.0 means the text is very positive and -1.0 means the text is very negative. You reply with one valid JSON object only, with the field "polarity". Explain step by step how you came up with the score in an additional JSON object field called "chain_of_thought" but do not summarize the text.',
                },
                {"role": "user", "content": f'"""{text}"""'},
            ],
        )

        # parse the json response
        response_json = response.choices[0].message.content
        print("Polarity response:", response_json)
        response_dict = json.loads(response_json)
        polarity = response_dict["polarity"]

        return {"score": polarity, "details": response_dict["chain_of_thought"]}
