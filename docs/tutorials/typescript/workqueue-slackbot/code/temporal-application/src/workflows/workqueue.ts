import {
  CancellationScope,
  CancelledFailure,
  continueAsNew,
  defineQuery,
  defineSignal,
  setHandler,
  workflowInfo,
  condition,
} from "@temporalio/workflow";
import {WorkqueueData} from "../../../common-types/types";

const getWorkqueueDataQuery = defineQuery<WorkqueueData[]>("getWorkqueueData");
const addWorkqueueDataSignal =
  defineSignal<[WorkqueueData]>("addWorkqueueData");
const claimWorkSignal =
  defineSignal<[{workId: string; claimantId: string}]>("claimWork");
const completeWorkSignal = defineSignal<[{workId: string}]>("completeWork");

export async function workqueue(existingData?: WorkqueueData[]): Promise<void> {
  const wqdata: WorkqueueData[] = existingData ?? [];

  // Register a Query handler for 'getWorkqueueData'
  setHandler(getWorkqueueDataQuery, () => {
    return wqdata;
  });

  // Register the Signal handler for adding work
  setHandler(addWorkqueueDataSignal, (data: WorkqueueData) => {
    wqdata.push(data);
  });

  // Register Signal handler for claiming work
  setHandler(claimWorkSignal, ({workId, claimantId}) => {
    const workItem = wqdata.find((item) => item.id === workId);
    if (workItem) {
      workItem.claimantId = claimantId;
      workItem.status = 2;
    }
  });

  // Register Signal handler for completing work
  setHandler(completeWorkSignal, ({workId}) => {
    const index = wqdata.findIndex((item) => item.id === workId);
    if (index !== -1) {
      wqdata.splice(index, 1);
    }
  });

  while (!workflowInfo().continueAsNewSuggested) {
    try {
      while (true) {
        // Await cancellation
        await CancellationScope.current().cancelRequested;
      }
    } catch (err) {
      if (err instanceof CancelledFailure) {
        // Set the Workflow status to Cancelled by throwing the CancelledFailure error
        throw err;
      } else {
        // Handle other types of errors
        throw err;
      }
    }
  }
  await continueAsNew(workqueue, [wqdata]);
}
