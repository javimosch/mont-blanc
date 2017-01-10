
. $(dirname "$0")/common_fn.sh

printf "SSH PWD: "
read_secret password
printf "ARGUMENT (ANYTHING): "
read tag
SSH_PWD=$password node -e "require('./utils/ssh').test_param('+$tag+')"

