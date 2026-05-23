import {setGlobalOptions} from "firebase-functions";
import {scheduledSync} from "@/lib/scheduler";

setGlobalOptions({maxInstances: 10});

export {scheduledSync};
