
. $(dirname "$0")/common_fn.sh
printf "Gitlab release tag (EX: v1.1.4, empty string will deploy master branch) :"
read tag
printf "Enviroment (preprod or prod) :"
read enviroment
printf "SSH PWD: "
read_secret password
SSH_PWD=$password node -e "require('./utils/ssh').deployTag('$tag','$enviroment')"

