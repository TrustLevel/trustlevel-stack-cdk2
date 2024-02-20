# Content Quality Playground
A simple UI to test different weights used to calculate the content quality score.

# Run Locally
1. Navigate to folder `cd workspaces/frontend/content-quality-playground`
1. Start Webserver
    * Python 3.x `python -m http.server 8080`
    * Python 2.x `python -m SimpleHTTPServer 8080 .`
1. Open Browser http://localhost:8080
    * Put some text to analyze in the large text area
    * Select an API environment
    * Provide the API Token
    * Adjust the weights (in the range [0.0, 1,0])
    * Click on Analyze 