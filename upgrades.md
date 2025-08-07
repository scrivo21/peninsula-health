 this file represents a list of upgrades that we want to leverage in the Hospital scheduler, they are in no particular order

- we want to include the ability to add and subtract shifts from the models
- We won the ability to double click on a shift within the calendar and change its assignment to a different doctor
- We want the ability to add in a period of unavailability for a doctor, this should be a simple form that you select the doctor and    the dates, and it updates the config file and such when you run a new roster it picks this up and excludes this doctor from the given time period
- We need to add the pages for the pages referenced in the footer including support privacy and about, they should simply just be pop-ups with scrollable content
- We need the ability to export a roster into CSV format for the user to distribute
- We need the ability to add an attribute to the doctors in the config.Json file that D marks them as senior or Junior, they may come constraints with this demarcation in the future
- ensure that when a roster is generated that the config file is read into cache to ensure all doctors and shifts etc are fresh and accurate
- in the backend code i'm not seeing a poor enough distribution of the tough shifts between doctors. find a way to substitute these tough shifts between doctors who have more and those who have less. 
- create an export report for the user to export the various view of the roster for distrbiution to their doctors. include the logo branding etc. it should come out as a PDF
- For frankston we want to add a shift called ESSU 2 TL (Floor Spare) as an AM shift which is weighed at 0, 
- write a user guide for the system and include it into a menu item named Docs. format it in chapters based on the core functionality of the web app front end. 
