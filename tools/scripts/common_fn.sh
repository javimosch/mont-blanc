read_secret()
{
    # Disable echo.
    stty -echo

    # Set up trap to ensure echo is enabled before exiting if the script
    # is terminated while echo is disabled.
    trap 'stty echo' EXIT

    # Read secret.
    read "$@"

    # Enable echo.
    stty echo
    trap - EXIT

    # Print a newline because the newline entered by the user after
    # entering the passcode is not echoed. This ensures that the
    # next line of output begins at a new line.
    echo
}

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

branchExists(){
    #$1 branchName
    #$2 GIT_DIR
    git ls-remote --heads $2 $1 | grep $1 >/dev/null
    if [ "$?" == "1" ] ; then 
        return 0
    else
        return 1
    fi
}


testExists(){
    #set vars
    tag=v1.1.1
    GIT_DIR=git@gitlab.com:javimosch/diagnostical.git
    
    
    #test 
    if tagExists $tag $GIT_DIR; then
        echo "found"
    else
        echo "not found"
    fi
    
    #test
    if branchExists master $GIT_DIR ; then 
        echo "Branch doesn't exist";    
        exit; 
    else
        echo "Branch exist";    
        exit; 
    fi
}