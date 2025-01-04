# Custom NPM

Unfortunately, due to some shenanigans in Grafana-land... they:

- Have a bunch of npm packages that are very useful and open source
- Publish those packages to npm behind authentication becuase they are
  "experimental" (nevermind the fact that they are used in other public
"production" packages in the released version of the product, which are
themselves published to npm and not behind authentication)

As a result, things are not buildable without a good bit of heartache and pain.
So we built our own npm!

## Get Started

First figure out what you want to do. There is a public container that you can
download and run...  it is built adhoc (not in CI), and pushed to GitHub
Container Registry.

To just "run the npm server", you can just run that container.

```
docker run -d -p 8080:8080 ghcr.io/colearendt/grafana-duckdb-datasource-npm:0.2.0
```
(Explore releases [here](https://github.com/users/colearendt/packages/container/package/grafana-duckdb-datasource-npm))

Once the npm server is running locally, you can install from packages using:

```
npm install --registry http://localhost:8080/
```

## Build

If you want to build the container yourself, you just need to build the docker container on the architecture that you desire with the tag that you require:

i.e.
```
# tweak version or other parameters as needed
./build.sh snakedotdev load

# if you want to push too
# ./build.sh snakedotdev push
```

This will set up verdaccio and start it so that we can publish packages to the service during the build process.

Then it will run the `publish-all.sh` script to publish all the packages to the service.

Finally, it will save the image and (by default) push it to the named container registry on ghcr.io

## Deploy the service

To deploy the service, you can just run the container with the tag that you want to use.

We have deployed this on fly.io for the time being. You can interact with (at the time of writing) version 0.2.0 by going to https://npm.api.benetist.com

TODO: we probably need to reconfigure to be sure things are written in a way that is not writable anymore when hosted publicly on the internet... 🤷‍♂️

## Update hashes

How to bump the hashes in the deployment? 

This is generally important to do when Grafana has moved packages forward, although some integration teting will be important to be sure that things still work well for our custom packages too.

For this, we will take a look at the [`publish-all.sh`](./publish-all.sh) script.

The commit hash is the commit hash of the Grafana repo that we want to use.

To find the commit hash, you can just go to the Grafana repo and find the commit hash of the commit that you want to use.

1. Change the commit hash in the [`publish-all.sh`](./publish-all.sh) script
2. Run the build script
3. Push the image to the container registry
4. Update the deployment with the new image tag

## Reference and Usage

You might think (indeed we did) that we could easily run this service in CI so
that it could just be used locally in the build process.

This is true in some sense. However, it is also a bit of a nightmare to debug.

As a result, we have gone with the "host publicly" since all of the code in the repository and in the npm repo is open source, anyways.

The main downside of this approach is:
- Cost - hosting a public service. This has been free thus far on fly.io
- Abuse - it is possible that a nefarious individual could abuse our service by
DoSing it (causing us a large bill) or by publishing bad packages to our service
(if we have any bugs in our deployment's security restrictions).

The "best" long term solution would be for Grafana to turn auth off for these "experimental" packages. We understand the risks.
