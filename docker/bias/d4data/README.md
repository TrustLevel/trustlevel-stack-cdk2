# Bias Detection based on d4data model
This is the bias API using the [d4data model](https://huggingface.co/d4data/bias-detection-model)

## Summary
The model's performance is mediocre. It detects most biased sentences (eventhough with not a high score) but cannot detect some obvious biased sentences.

The test data was generated with ChatGPT 3.5. See [proof-of-concepts](https://github.com/TrustLevel/proof-of-concepts/tree/main/bias-detection/d4data) for how the following results were generated.

<details>
<summary>Show table results</summary>

| sentence                                                                                                                                                                      | label      | score              | expected_label | expected_score |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------ | -------------- | -------------- |
| Women are naturally more nurturing than men.                                                                                                                                  | Biased     | 0.6526679396629333 | biased         | 0.8            |
| Immigrants are responsible for the rise in crime rates.                                                                                                                       | Non-biased | 0.6713736057281494 | biased         | 0.7            |
| People from rural areas are less intelligent than those from urban areas.                                                                                                     | Biased     | 0.5620691180229187 | biased         | 0.6            |
| The government's policies always favor the rich.                                                                                                                              | Biased     | 0.6117877960205078 | biased         | 0.9            |
| Muslims are inherently violent.                                                                                                                                               | Biased     | 0.5383952260017395 | biased         | 0.75           |
| LGBTQ+ individuals are mentally ill.                                                                                                                                          | Non-biased | 0.6558012366294861 | biased         | 0.85           |
| People with disabilities are a burden on society.                                                                                                                             | Biased     | 0.5670897364616394 | biased         | 0.7            |
| Men are better leaders than women.                                                                                                                                            | Biased     | 0.9766878485679626 | biased         | 0.8            |
| Asians are naturally good at math.                                                                                                                                            | Biased     | 0.6453569531440735 | biased         | 0.65           |
| Millennials are lazy and entitled.                                                                                                                                            | Biased     | 0.6984381079673767 | biased         | 0.75           |
| The sun rises in the east.                                                                                                                                                    | Biased     | 0.6859610676765442 | non biased     | 0.2            |
| Water freezes at 0 degrees Celsius.                                                                                                                                           | Non-biased | 0.9142873287200928 | non biased     | 0.3            |
| The Earth orbits around the sun.                                                                                                                                              | Biased     | 0.9809190630912781 | non biased     | 0.2            |
| The acceleration due to gravity is approximately 9.8 m/s^2.                                                                                                                   | Non-biased | 0.9526739716529846 | non biased     | 0.3            |
| Plants require sunlight for photosynthesis.                                                                                                                                   | Non-biased | 0.5358158946037292 | non biased     | 0.3            |
| Oxygen is necessary for human survival.                                                                                                                                       | Biased     | 0.9783470630645752 | non biased     | 0.3            |
| DNA is the genetic material found in cells.                                                                                                                                   | Biased     | 0.5492093563079834 | non biased     | 0.3            |
| The Pythagorean theorem states that in a right triangle, the square of the length of the hypotenuse is equal to the sum of the squares of the lengths of the other two sides. | Biased     | 0.5413097739219666 | non biased     | 0.2            |
| Water consists of two hydrogen atoms and one oxygen atom.                                                                                                                     | Non-biased | 0.5744374394416809 | non biased     | 0.3            |
| The Earth is approximately 4.5 billion years old.                                                                                                                             | Non-biased | 0.9084227085113525 | non biased     | 0.2            |
</details>

## Docker image

### Local
* Build docker image locally `docker build -t bias-detection .`
* Run docker image locally `docker run -p 8080:5000 -d bias-detection`
* Test if container is running correctly: `curl -X POST http://localhost:8080/analyze  -H "Content-Type: application/json" -d '{"text":"Hallo"}'`

### Build for ECS
#### Repository creation

```bash
# authenticate docker to the ECR repository
AWS_PROFILE=trustlevel aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 086829801639.dkr.ecr.eu-west-1.amazonaws.com

# create ECR repository
AWS_PROFILE=trustlevel aws ecr create-repository --repository-name bias-d4data --region eu-west-1
```

#### Build and push docker image

```bash
# setup buildx to build for different platfroms (such as amd64 and arm64)
docker buildx create --name mybuilder --use
docker buildx inspect --bootstrap

# NOTE: Building for multiple platforms (linux/amd64,linux/arm64) resulted in an build error
docker buildx build --platform linux/arm64 -t 086829801639.dkr.ecr.eu-west-1.amazonaws.com/bias-d4data:latest --push .

# validation only
docker manifest inspect 086829801639.dkr.ecr.eu-west-1.amazonaws.com/bias-d4data:latest
```

#### Update service on aws

```bash
# setup buildx to build for different platfroms (such as amd64 and arm64)
docker buildx create --name mybuilder --use
docker buildx inspect --bootstrap

# push new image based on current local state
# NOTE: Building for multiple platforms (linux/amd64,linux/arm64) resulted in an build error
docker buildx build --platform linux/arm64 -t 086829801639.dkr.ecr.eu-west-1.amazonaws.com/bias-d4data:latest --push .

# force new deployment
AWS_PROFILE=trustlevel aws ecs update-service --cluster <stage>-BiasDetectCluster --service <stage>-BiasDetectService --force-new-deployment --region eu-west-1

# example:
AWS_PROFILE=trustlevel aws ecs update-service --cluster dev-BiasDetectCluster --service dev-BiasDetectService --force-new-deployment --region eu-west-1 
```


### Misc
* To update the *requirements.txt* you can use `pipenv requirements > src/requirements.txt`. However, having all peer dependencies in the *requirements.txt* resulted in some issues, so make sure only the relevant dependencies are present.