**User EndPoints**
Add Save Job endpoint
Add Get Saved Jobs endpoint
On fetching a job or some jobs, make sure to add isSaved field to each of them
Add 'Get A Company's Job Posting' endpoint

**Company Endpoints**
Send Email to Job Seeker
Add 'Get Accepted Applicants' endpoint

# TODO
checkout 'getProfileViewsDetail' function in the user controller
handle deletion of unused resume & photos when updating user profile, and unused business doc & photo whilst updating company
validations for all apis
can't use old passwords
if mailersend, delete workmail

# Frontend Notes

1.  Added a new optional field to messages: file.name. I need it in order to properly write message notification that is file-based and not message-based
