

### line height problem (Attached file)
 
    DONE
 
###I cannot subscribe here : https://blooming-refuge-27843.herokuapp.com/#/new-inscription
####error message : password required !
 
    DONE

###Can you add possibility to upload Certification (the Diploma wich display in back office) . I would like to give the possibility to upload several files

    That is already implemented. You need to go to 
    https://blooming-refuge-27843.herokuapp.com/admin#/diag-inscription
    After clicking 'Next', the Diplomes option appear.
    Clicking ADD adds a new row to select a file. Clicking the upload icon will upload the file
    and save the diag again. 
    After the save proccess, you can press the ADD button again to add another file row.
    
###The colored background block on home page wich change color for each diag, could have the same width as the booking block above
 
    DONE


###Attached file : weird behavior… only 4 slots a day..; sorted by hour…not 5 with wrong order

    I could not reproduce this issue. But I code a validation to avoid render more than four slots.

###In attached file a PSD with the subtitle i want under Les diagnostics obligatoires :
 
    DONE

###Can I edit the Content pages (ERNMT, FAQ, Home page text blocks with all the diags) in the back office with a wizywig 
 
    Yes, is possible. I'm including an editor I have in BO. You can find it in 
    Settings -> Text
    
    You neet to create items that match tue CODE required in the page.
    EX: In the ERNMT page, you have PAGE_ERNMT_BLOCK_TITLE
    Create an item with that code and will automatically render in the site.
    
    To help you guess what CODES are available in any screen, I added a list of requested CODES to the debug
    screen I mention before. Just write 'debug' and press ENTER anywhere in the site. Press ENTER again to hide it.
    
    Let me know if you have problems to add text to the site.
    And please backup the CODE and text of every item you add in excel or somewhere because are being stored in the dev database.
 
 
 
 




