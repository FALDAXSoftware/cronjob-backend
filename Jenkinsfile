#!/usr/bin/env groovy

def label = "buildpod.${env.JOB_NAME}.${env.BUILD_NUMBER}".replace('-', '_').replace('/', '_').take(63)
def gitCredentialsId = "github"
def imageRepo = "100.69.158.196"
def ip_address = "3.135.59.18"
def sshagent_name = "simplex-prod"
def dirName = "faldax-simplex"

podTemplate(label: label, containers: [
        containerTemplate(name: 'build-container', image: imageRepo + '/buildtool:deployer', command: 'cat', ttyEnabled: true),
        containerTemplate(name: 'pm291', image: imageRepo + '/buildtool:pm291', command: 'cat', ttyEnabled: true),
    ],
    volumes: [
        hostPathVolume(mountPath: '/var/run/docker.sock', hostPath: '/var/run/docker.sock')
    ]
) {
    timeout(9) {
        def coinToDeploy;
        def triggerByUser;
        def namespace;
        node(label) {

            // Wipe the workspace so we are building completely clean
            deleteDir()

            stage('Docker Build') {
                container('build-container') {
                    def myRepo = checkout scm
                    gitCommit = myRepo.GIT_COMMIT
                    shortGitCommit = "${gitCommit[0..10]}${env.BUILD_NUMBER}"
                    imageTag = shortGitCommit
                    namespace = getNamespace(myRepo.GIT_BRANCH);
                    if (env.BRANCH_NAME == "master") {
                        sshagent(["${sshagent_name}"]) {
                            sh "ssh -o StrictHostKeyChecking=no ubuntu@${ip_address} 'sudo cd /home/ubuntu/${dirName}-master && sudo git pull origin master'"
                            sh "ssh -o StrictHostKeyChecking=no ubuntu@${ip_address} 'sudo cd /home/ubuntu/${dirName}-master && sudo docker build -t faldax-simplex-master .'"
                            sh "ssh -o StrictHostKeyChecking=no ubuntu@${ip_address} 'sudo docker run --restart always -d -p 3000:3000 --name faldax-simplex-master-cont faldax-simplex-master:latest'"
                            sh "ssh -o StrictHostKeyChecking=no ubuntu@${ip_address} 'sudo docker rmi ${docker ps -a -q}' || echo 'Error deleteing docker images'"
                        }
                    }
                    if (env.BRANCH_NAME == "mainnet") {
                        sshagent(["${sshagent_name}"]) {
                            sh "ssh -o StrictHostKeyChecking=no ubuntu@${ip_address} 'sudo cd /home/ubuntu/${dirName}-mainnet && sudo git pull origin mainnet'"
                            sh "ssh -o StrictHostKeyChecking=no ubuntu@${ip_address} 'sudo cd /home/ubuntu/${dirName}-mainnet && sudo docker build -t faldax-simplex-mainnet .'"
                            sh "ssh -o StrictHostKeyChecking=no ubuntu@${ip_address} 'sudo docker run --restart always -d -p 3001:3000 --name faldax-simplex-mainnet-cont faldax-simplex-mainnet:latest'"
                            sh "ssh -o StrictHostKeyChecking=no ubuntu@${ip_address} 'sudo docker rmi ${docker ps -a -q}' || echo 'Error deleteing docker images'"
                        }
                    }
                }
            }
        }
    }
}

def getNamespace(branch) {
    switch (branch) {
        case 'master': return "prod";
        case 'development': return "dev";
        case 'pre-prod': return "pre-prod";
        case 'mainnet': return "mainnet";
        default: return null;
    }
}