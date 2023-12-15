from flask import Flask, request, jsonify
import spacy
from spacytextblob.spacytextblob import SpacyTextBlob
import logging
from logging.handlers import RotatingFileHandler
from logging.config import dictConfig
import os

dictConfig({
    'version': 1,
    'formatters': {'default': {
        'format': '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]',
    }},
    'handlers': {'wsgi': {
        'class': 'logging.StreamHandler',
        'stream': 'ext://sys.stdout',
        'formatter': 'default',
    }},
    'root': {
        'level': 'INFO',
        'handlers': ['wsgi'],
    }
})

app = Flask(__name__)

# Configure logging
if not os.path.exists('logs'):
    os.mkdir('logs')
file_handler = RotatingFileHandler('logs/spacytextblob.log', maxBytes=10240, backupCount=10)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)
app.logger.info('SpacyTextBlob startup')

# Load SpaCy and add spacytextblob to the pipeline
nlp = spacy.load("en_core_web_sm")
nlp.add_pipe('spacytextblob')
app.logger.info('Nlp setup complete')

@app.route('/analyze', methods=['POST'])
def analyze_text():
    app.logger.info('Received request to analyze')
    data = request.json
    text = data.get('text')
    if not text:
        app.logger.error('No text provided for analysis')
        return jsonify({'error': 'No text provided'}), 400

    try:
        doc = nlp(text)
        # Log only the first 30 characters of the text
        preview_text = text[:30] + '...' if len(text) > 30 else text
        app.logger.info(f'Analyzed text (preview): {preview_text}')
        return jsonify({
            'polarity': doc._.polarity,
            'subjectivity': doc._.subjectivity,
            'assessments': doc._.assessments
        })
    except Exception as e:
        app.logger.error(f'Error in processing text: {preview_text}', exc_info=True)
        return jsonify({'error': 'Error in processing request'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
