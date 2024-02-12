"""
Script to download models from huggingface. That can be used when building
docker images to cache the model in the docker image itself. Set 
`TRANSFORMERS_CACHE` environment variable to specify where the model should
be cached
"""

from transformers import pipeline
from transformers import AutoTokenizer, TFAutoModelForSequenceClassification

tokenizer = AutoTokenizer.from_pretrained("d4data/bias-detection-model")
model = TFAutoModelForSequenceClassification.from_pretrained(
    "d4data/bias-detection-model"
)
classifier = pipeline(
    "text-classification", model=model, tokenizer=tokenizer
)  # cuda = 0,1 based on gpu availability
