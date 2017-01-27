
. $(dirname "$0")/common_fn.sh
printf "SSH PWD: "
read_secret password
printf "TAG NAME (EX: v1.1.4) :"
read tag
SSH_PWD=$password node -e "require('./utils/ssh').deployTag('$tag')"

