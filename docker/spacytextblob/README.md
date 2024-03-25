# Spacytextblob container

Based on [spacytextblob-poc](https://github.com/TrustLevel/spacytextblob-poc) this is the Spacytextblob container project deployed to AWS.

## Build and run locally

```bash
# build docker image
docker build -t spacytextblob .

# run docker image
docker run -p 4000:5000 spacytextblob

# execute bad sentiment example AC-01
curl -X POST http://localhost:4000/analyze \
-H "Content-Type: application/json" \
-d "{\"text\":\"The city lay in utter ruin, its once vibrant streets now a bleak canvas of despair. Buildings, scarred by the relentless march of time, stood as hollow shells, their empty windows like soulless eyes. The air was thick with the stench of decay, a poignant reminder of forgotten dreams and lost hopes. Shadows lurked in every corner, hinting at unseen dangers and long-kept secrets. The relentless rain, cold and unyielding, seemed to wash away the last vestiges of joy, leaving behind only a deep, pervasive sorrow. It was a place abandoned by happiness, where despair reigned supreme, unchallenged by the faintest glimmer of hope.\"}"

# execute good sentiment example AC-02
curl -X POST http://localhost:4000/analyze \
-H "Content-Type: application/json" \
-d "{\"text\":\"The sun kissed the vibrant city with its warm, golden rays, bringing life and color to every corner. Streets buzzed with the cheerful chatter of people, their laughter blending into a harmonious melody of joy and contentment. Gardens bloomed with a kaleidoscope of flowers, their fragrant aroma filling the air with a sense of renewal and hope. Children played with unbridled enthusiasm in the parks, their smiles as bright as the clear blue sky overhead. Love and friendship flourished, creating an atmosphere of warmth and belonging. It was a place where dreams were nurtured, and happiness danced freely, touching the hearts of everyone.\"}"
```

## Repository creation

```bash
# authenticate docker to the ECR repository
AWS_PROFILE=trustlevel aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 086829801639.dkr.ecr.eu-west-1.amazonaws.com

# create ECR repository
AWS_PROFILE=trustlevel aws ecr create-repository --repository-name spacytextblob --region eu-west-1
```

## Build and push docker image

```bash
# setup buildx to build for different platfroms (such as amd64 and arm64)
docker buildx create --name mybuilder --use
docker buildx inspect --bootstrap

docker buildx build --platform linux/amd64,linux/arm64 -t 086829801639.dkr.ecr.eu-west-1.amazonaws.com/spacytextblob:latest --push .

# validation only
docker manifest inspect 086829801639.dkr.ecr.eu-west-1.amazonaws.com/spacytextblob:latest
```

## Update service on aws

```bash
# setup buildx to build for different platfroms (such as amd64 and arm64)
docker buildx create --name mybuilder --use
docker buildx inspect --bootstrap

# push new image based on current local state
docker buildx build --platform linux/amd64,linux/arm64 -t 086829801639.dkr.ecr.eu-west-1.amazonaws.com/spacytextblob:latest --push .

# force new deployment
AWS_PROFILE=trustlevel aws ecs update-service --cluster <stage>-SpacytextblobCluster --service <stage>-SpacytextblobService --force-new-deployment --region eu-west-1

# example:
AWS_PROFILE=trustlevel aws ecs update-service --cluster dev-SpacytextblobCluster --service dev-SpacytextblobService --force-new-deployment --region eu-west-1 
```
