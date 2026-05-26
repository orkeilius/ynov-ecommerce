node('docker') {
  def services = ['api', 'worker', 'admin']

  stage('Checkout') { checkout scm }

  // Boucle dynamique — impossible en déclaratif sans matrix
  def parallelStages = [:]
  services.each { svc ->
    parallelStages[svc] = {
      stage("Test ${svc}") {
        dir(svc) {
          sh 'npm ci && npm test'
        }
      }
    }
  }
  parallel parallelStages

  // Logique conditionnelle riche
  if (env.BRANCH_NAME == 'main' && currentBuild.changeSets.size() > 0) {
    stage('Release') {
      def version = sh(returnStdout: true, script: 'git describe --tags').trim()
      sh "./release.sh ${version}"
    }
  }
}