echo "deploy tag: start"

#Argument 1: Tag to deploy. Ex: v1.7.3
#Argument 2: Script version. Ex: new (DEPRECATED, IGNORED)

tagExists(){
    #$1 tagName
    #$2 GIT_DIR
    tag=$1
    GIT_DIR=$2
    echo "tagExists? $1 $2"
    if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
        return 0
    else
        return 1
    fi
}

echo "cd repo..."
cd repo
git reset HEAD .env
git checkout -- .env
git fetch origin --tags
GIT_DIR=git@gitlab.com:javimosch/diagnostical.git
echo "Checking tag..."
if tagExists $1 $GIT_DIR; then
	echo "Tag $1 exists in origin, fetch in progress"
	git checkout $1
	cd ..

	#Startup script: We save the last deployed tag to be used by deploy_last_tag script
	echo $1 > last_deployed_tag.save

    echo "deploy tag: Executing script deploy_current"
	./deploy_current.sh 

else
 echo "deploy tag: $1 do not exists in origin, abort."
 exit 1
fi

echo "deploy tag: finish"
