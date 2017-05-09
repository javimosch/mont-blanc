#!/bin/bash

#filename: deploy_last_tag.sh

#This scripts acts like a middleware. 
#It checks the last tag in the file 
#If there is a valid tag, proceed with deployment.

file="last_tag.save"
if [ -f "$file" ]
then
	tag=$(cat $file);
	if [[ $tag == v*.*.* ]]; then 
	    echo "Deploy middleware success: tag is $tag"
	else 
	    echo "Deploy failed: Invalid tag $tag"
	fi
else
	echo "Deploy failed: $file not found"
fi