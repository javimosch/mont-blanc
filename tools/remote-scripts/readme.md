#The scripts in this folder need to be placed in the production server.
#(Only for private VPS, who are configured manually, if you use a PaaS follow your PaaS deployment steps)

The production server tree need to be like:

`````````
/ Anywhere

    prod    Here is where the project is compiled and exposed by express / nodejs
    
    repo    Here is the server repository of the project. Scripts use this folder
    
    deploy_current.sh   Script to deploy current state of the repo folder
    
    deploy_tags.sh  Script to checkout and deploy a remote tag. Uses deploy_current.sh
    
    last_tag.save  This is a temporal file that contains the latest tag deployed to the server
    
    env_prod.confg  This file is should contains the production enviromental variables. 
                    This file is copied as .env in the prod folder and is readed by nodejs process.
    
`````````