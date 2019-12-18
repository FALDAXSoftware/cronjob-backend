#!/usr/bin/env groovy
def label = "buildpod.${env.JOB_NAME}.${env.BUILD_NUMBER}".replace('-', '_').replace('/', '_').take(63)
def gitCredentialsId = "github"
def project_name = "faldax-simplexbackend"
def dirName = "${project_name}"
def image_name = "faldax-simplex"
def container_name = "${image_name}" + "-cont"
def sshagent_name = "simplex-prod"
def ip_address = "3.135.59.18"
def system_port = "443"
def cont_port = "3000"
def imageRepo = "100.69.158.196"
podTemplate(label: label, containers: [
     containerTemplate(name: 'build-container', image: imageRepo + '/buildtool:deployer', command: 'cat', ttyEnabled: true),
], 
volumes: [
    hostPathVolume(mountPath: '/var/run/docker.sock', hostPath: '/var/run/docker.sock')
]
){
  timeout(9){
      node(label) {
            // Wipe the workspace so we are building completely clean
         deleteDir()

         stage('Docker Build'){
         container('build-container'){
             script {
            sshagent(["${sshagent_name}"]) {
                    sh "ssh -o StrictHostKeyChecking=no ubuntu@${ip_address} 'cd /home/ubuntu/${dirName} && git pull origin master'"
                    sh "ssh -o StrictHostKeyChecking=no ubuntu@${ip_address} 'cd /home/ubuntu/${dirName} && sudo docker build -t ${project_name} ."
                    sh "ssh -o StrictHostKeyChecking=no ubuntu@${ip_address} 'sudo docker rm -f ${container_name} || date'"
                    sh "ssh -o StrictHostKeyChecking=no ubuntu@${ip_address} 'sudo docker run --restart always -d -p ${system_port}:${cont_port} --name ${container_name} ${project_name}:latest'"
                    }
                } 
         }
            }
        }
    }
}