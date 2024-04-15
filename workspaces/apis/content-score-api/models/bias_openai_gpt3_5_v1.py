from typing import Dict, Any


class BiasOpenAIGPT35V1:
    def analyze_text(self, text: str, config: Dict[str, Any]) -> float:
        print("BiasOpenAIGPT35V1", text, config)
        return 0.5
