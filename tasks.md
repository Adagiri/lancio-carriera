__User EndPoints__
Add Update Profile Endpoint (Check, so as to delete un-used resume & profile-photo)
On fetching profile info, include the total profile views count
Add Save Job endpoint
Add Get Saved Jobs endpoint
On fetching a job or some jobs, make sure to add isSaved field to each of them
Add 'Get A Company's Job Posting' endpoint
Add endpoint to edit notifications settings
Report a Job - (Send notification to the Job Owner, Keep notification count)

__Company Endpoints__
Send Email to Job Seeker
Update Profile Endpoint (Check, so as to delete un-used business doc & profile-photo)
On fetching profile info, include the total applications count
Add 'Get Accepted Applicants' endpoint
Add endpoint to edit notifications settings
Report a Job seeker - Send notification to the Job Seeker
Report a Job poster - Send notification to the Job poster


# TODO

validations for all apis
can't use old passwords
if mailersend, delete workmail



# CURRENT TASKS
1. Notifications - [Last for 6months]
__Company__
Someone Applied to Job
Closed a Job Position
Posted a Job
__User__
Message from company about a Job
 - File Messages are different
Application accepted
A Closed Position

# Handle notification switches in the profile
# Configure notification for both user and company
# Integrate the scenerios which requires notification. Test them
# Move to the remaining apis above