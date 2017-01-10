
. $(dirname "$0")/common_fn.sh
printf "SSH PWD: "
read_secret password
SSH_PWD=$password node -e "require('./utils/ssh').deployMaster()"

