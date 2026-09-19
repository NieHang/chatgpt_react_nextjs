# This file is for reviewing the solutions for issues I have encountered

## init agentLoop once, run anytime

Background: I defined **openAIClient** and **contextManager** inside **initAgentLoop** function. However, when a user switches accounts, the module-level agent continues to reuse the client initialized for previous account.

Issue: Because API keys are user-specific, subsequent requests could use the previous user's credentials. **ContextManager** could also save messages under the wrong account.

## Preserve tool call/result pairs during context compaction

Conversation history can contain `function_call` and `function_call_output` items linked by `call_id`. When summarizing older items while retaining recent ones, the cutoff may separate a tool call from its result.

If the call is replaced by a text summary while its structured result is retained, the result loses its corresponding structured call.

Solution:

1. Set the initial cutoff to keep the latest 10 items.
2. Scan backward from the last item to the cutoff.
3. For each `function_call_output`, find its matching `function_call`
   using `call_id`.
4. If that call is before the cutoff, move the cutoff backward to
   the call's position. Continue scanning through the newly included
   items, adjusting the cutoff again if necessary.
5. Summarize only the items before the final cutoff. Keep everything
   from the cutoff onward unchanged. If the cutoff reaches the start
   of the history, skip compaction.

## SessionMemory won't be refreshed

I have put SessionMemory inside a request so the sessionMemory can be injected to the instructions of the agent. It triggers an issue: the instructions were fixed. If the agent called some functions like recordFile, the instructions wouldn't be updated even the promptBlock of the sessionMemory updated.

Solution:
Put sessionMemory inside a `while` loop of agentLoop. Any tool and decision making update to `sessionMemory` appears in the next model call.
