# This file is for reviewing the solutions for issues I have encountered

## init agentLoop once, run anytime

Background: I defined **openAIClient** and **contextManager** inside **initAgentLoop** function. However, when a user switches accounts, the module-level agent continues to reuse the client initialized for previous account.

Issue: Because API keys are user-specific, subsequent requests could use the previous user's credentials. **ContextManager** could also save messages under the wrong account.
