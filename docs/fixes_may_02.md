##—— HomePage ——
- *stripe sentence is not integrated (check design).. its there in all booking page  
        DONE

- Appartement AND the Maison Box are too closed to each other… Move to right the Maison choice
        DONE

- select 90-110m2 by default
        DONE

- Give me explanation how to integrate parameters in URL
        
        It works as always.
        First parameter, you put '?' after the current url.
        For more than one parameter, you concatenate with '&'.
        EX: 
            www.diags.com/#/home?param1=bar
            www.diags.com/#/home?param1=bar&param2=foo

        Pay attention to '#/home'. This belongs to the 'anchor' section of the URL.
        Possible anchors for booking are:
        #/home
        #/choix-diagnostics
        #/rendez-vous
        #/connexion
        #/payment
        #/contactez-nous
        #/ernmt
        #/faq
        #/conditions-generales-utilisation
        #/mentions-legales
        #/new-inscription
        
        
        The anchor indicates angular what screen to load. Remember, this a one-page application.
        The anchor must be located prior to the parameters. That's a requirement.
        

- In the header replace ERNT into ERNMT
        DONE

- In all the purple cards ERNMT… The text inside is "État des risques naturels, miniers et technologiques » … even in the diag name we have in the Diag choices pages you should change there the title
        DONE

- When we check a box it should be in white when background is this light blue
        DONE

        Note: The color of the checkbox mark (when checked) in the home page. 
        This is what I resolve. If you were refering to something else let me know.
        

- Add a space between - AND de 15 ans (same for +)
        DONE

——

##— Booking problem —
I cannot subscribe through the booking process : flash message : « Password required »…. 
        DONE

Can you move all the flash message just below the header ?
        DONE

- When the client is a « Propriétaire », there is an integration problem : check attached file (its shifted)
        DONE


- When its a MAISON … On the Confirm and payment page Batim / Code / Etage fields should be hidden
        
        When Maison (House), those fields are currently being hide.
        
        To check if things are working ok in your test, you can write 'debug' and press ENTER anywhere in the screen (focus on the site). 
        You will see the current status of "order.info.house" (on the middle-left) who determine if those fields are hidden or not.


- When its an Appartement, fields are ok : Batim field should be by default « sur rue » ...
        DONE (Batiment changed to rue)

##—— Contactez-nous page ——

Its a form with fields :
- Prénom Nom
- Email
- Phone Number
- Message
ENVOYER button (to send)
——

        DONE

##—— Admin page ——
There is possibility to log in and to subscribe as a diagnostiqueur. When I click on S’inscrire, I should find here all the fields we have in back office for each diagnostiqueur.  When click on S’inscrire it adds the diagnostiqueur in BO but Inactivate and Superadmin receive an email… In BO SUperadmin can check the details and activate the diag man

        DONE
        All the fields were added. The working exceptions are only accesible in BO when logged.
        Diplomes become available to upload after pressing Next. (Diplomes need the diag to be saved in the DB first).
        Diag inscription is a public url, and now the new account is created with the disabled flag
        Diag inscription is accesible with the anchor: #/diag-inscription
        

- What is browse in header…. weird 
        Now is different, without 'browse'.
———

##— Price structure ——

From Monday to Friday : Normal price
Saturday : + 30%
Sunday : + 100%

Emergency Penalities
- TODAY from monday to friday : +30%
- TODAY saturday : + 50%
- TODAY sunday : + 130%

- TOMORROW from monday to friday : 10%
- TOMORROW saturday : + 40%
- TOMORROW sunday : + 110%
——

        DONE
        To check if things are working ok in your test, you can write 'debug' and press ENTER anywhere in the screen (focus on the site). You will see the Price modifiers being in effect in the middle-left of the screen.