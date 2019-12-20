#!/usr/bin/env groovy
def label = "buildpod.${env.JOB_NAME}.${env.BUILD_NUMBER}".replace('-', '_').replace('/', '_').take(63)
def gitCredentialsId = "github"
def imageRepo = "100.69.158.196"
podTemplate(label: label, containers: [
    containerTemplate(name: 'build-container', image: imageRepo + '/buildtool:deployer', command: 'cat', ttyEnabled: true),
    containerTemplate(name: 'pm291', image: imageRepo + '/buildtool:pm291', command: 'cat', ttyEnabled: true),
],
    volumes: [
    hostPathVolume(mountPath: '/var/run/docker.sock', hostPath: '/var/run/docker.sock')
]
){
    timeout(9){
        def coinToDeploy;
        def triggerByUser;
        def namespace;
        node(label) {

            // Wipe the workspace so we are building completely clean
            deleteDir()

            stage('Docker Build'){
                container('build-container'){
                    def myRepo = checkout scm
                    gitCommit = myRepo.GIT_COMMIT
                    shortGitCommit = "${gitCommit[0..10]}"
                    imageTag = shortGitCommit
                    namespace = getNamespace(myRepo.GIT_BRANCH);
                    if (namespace) {
                        sh "ls -a"
                        sh "docker build -t ${imageRepo}/cronjob:${imageTag}  ."
                        sh "docker push  ${imageRepo}/cronjob:${imageTag}"
                        sh "helm upgrade --install --namespace ${namespace} --set image.tag=${imageTag} ${namespace}-cronjob -f chart/values.yaml chart/"
                    }
                }
            }
        }
    }
}

def getNamespace(branch){
    switch (branch) {
        case 'master': return "prod";
        case 'development': return "dev";
        case 'pre-prod': return "pre-prod";
        default: return null;
    }
}

