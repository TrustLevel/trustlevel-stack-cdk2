import os
import logging

from flask import Flask, request, jsonify
from logging.handlers import RotatingFileHandler
from logging.config import dictConfig

from transformers import AutoTokenizer, TFAutoModelForSequenceClassification
from transformers import pipeline


dictConfig(
    {
        "version": 1,
        "formatters": {
            "default": {
                "format": "%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]",
            }
        },
        "handlers": {
            "wsgi": {
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
                "formatter": "default",
            }
        },
        "root": {
            "level": "INFO",
            "handlers": ["wsgi"],
        },
    }
)

app = Flask(__name__)

# Configure logging
if not os.path.exists("logs"):
    os.mkdir("logs")
file_handler = RotatingFileHandler(
    "logs/bias-detection.log", maxBytes=10240, backupCount=10
)
file_handler.setFormatter(
    logging.Formatter(
        "%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]"
    )
)
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)
app.logger.info("Bias Detection startup")

# Load SpaCy and add spacytextblob to the pipeline
# Initialize the text classification pipeline
tokenizer = AutoTokenizer.from_pretrained("d4data/bias-detection-model")
model = TFAutoModelForSequenceClassification.from_pretrained(
    "d4data/bias-detection-model"
)
classifier = pipeline(
    "text-classification", model=model, tokenizer=tokenizer
)  # cuda = 0,1 based on gpu availability
app.logger.info("model setup complete")

def combine_classifications(classifications):
    """
    Combine the results of multiple classifications within one text corpus into a single result
    """
    app.logger.info(f"combine classifications: {classifications}")

    bias_score = 0
    non_bias_score = 0
    biased_chunks = 0
    non_biased_chunks = 0
    for chunk in classifications:
        if chunk["label"] == "Biased":
            biased_chunks += 1
            bias_score += chunk["score"]
        else:
            non_biased_chunks += 1
            non_bias_score += chunk["score"]
    bias_score = bias_score / biased_chunks if biased_chunks > 0 else 0
    non_bias_score = non_bias_score / non_biased_chunks if non_biased_chunks > 0 else 0

    app.logger.info(f"bias_score: {bias_score} non_bias_score: {non_bias_score}")

    if bias_score > non_bias_score:
        # text is mostly biased
        return {
            "label": "Biased",
            "score": bias_score - non_bias_score
        }
    
    # text is mostly non-biased
    return {
        "label": "Non-biased",
        "score": non_bias_score - bias_score
    }

@app.route("/analyze", methods=["POST"])
def analyze_text():
    app.logger.info("Received request to analyze")
    data = request.json
    text = data.get("text")
    if not text:
        app.logger.error("No text provided for analysis")
        return jsonify({"error": "No text provided"}), 400

    try:
        # chunk text into 400 tokens
        tokens = text.split()
        classified_chunks = []
        for i in range(0, len(tokens), 300):
            chunk = " ".join(tokens[i : i + 300])
            classified_chunks.append(classifier(chunk)[0])

        result = combine_classifications(classified_chunks)

        # Log only the first 30 characters of the text
        preview_text = text[:30] + "..." if len(text) > 30 else text
        app.logger.info(f"Analyzed text (preview): {preview_text}")
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error in processing text: {preview_text}", exc_info=True)
        return jsonify({"error": "Error in processing request"}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")
