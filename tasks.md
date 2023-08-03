**User EndPoints**
Add Update Profile Endpoint (Check, so as to delete un-used resume & profile-photo)
On fetching profile info, include the total profile views count
Add Save Job endpoint
Add Get Saved Jobs endpoint
On fetching a job or some jobs, make sure to add isSaved field to each of them
Add 'Get A Company's Job Posting' endpoint

**Company Endpoints**
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

# Handle notification switches in the profile _done_

# Setup notification for both user and company _done_

# Integrate the scenerios which requires notification. Test them _done_

# Create APIS for fetching notifications

# Create APIS for marking notification as read

# Move to the remaining apis above


# Frontend Notes

1.  Added a new optional field to messages: file.name. I need it in order to properly write message notification that is file-based and not message-based
