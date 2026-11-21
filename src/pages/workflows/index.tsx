import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSnackbar } from "notistack";
import Layout from "../../components/layout/Layout";
import { TailwindPageLayout } from "../../components/layout/TailwindPageLayout";
import WorkflowsHeader from "@/components/workflows/WorkflowsHeader";
import WorkflowsDataGrid, { WorkflowRow } from "@/components/workflows/WorkflowsDataGrid";
import { GridApi } from "ag-grid-community";
import workflowService, { WorkflowDetails } from "@/lib/services/workflowService";
import { getProjectId } from "@/lib/storage/sharedStorage";
import * as workflowCommunicationService from "@/lib/services/workflowCommunicationService";
import NoRecordsFound from "@/components/common/NoRecordsFound";
import Spinner from "@/components/common/Spinner";
import AddWorkflowModal from "@/components/workflows/subs/AddWorkflowModal";
import EditWorkflowModal from "@/components/workflows/subs/EditWorkflowModal";

const Workflows: NextPage = () => {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowDetails | null>(null);
  const [rawWorkflowList, setRawWorkflowList] = useState<any[]>([]);

  const formatDate = useCallback((value: any): string => {
    if (!value) return "";
    if (typeof value === "number") {
      return new Date(value).toISOString().replace("T", " ").split(".")[0];
    }
    if (typeof value === "string" && value.includes("T")) {
      return value.replace("T", " ").split(".")[0];
    }
    return String(value);
  }, []);

const mapWorkflows = useCallback((items: any[] = []): WorkflowRow[] => {
  return items.map((item) => {
    const statusVal = item.status ?? item.active ?? "";
    let statusLabel = "";
    if (statusVal === 1 || statusVal === "1") statusLabel = "Active";
    else if (statusVal === 0 || statusVal === "0") statusLabel = "Inactive";
    else statusLabel = (statusVal ?? "").toString();

    return {
      id: Number(item.id),
      serialNo: item.serialNo || "",
      name: item.name || "-",
      description: item.workflowDescription ?? item.description ?? "",
      entity: item.entityName || item.entity || "",
      trigger: item.triggerName || item.trigger || "",
      createdBy: item.createdByUser || "",
      createdOn: formatDate(item.createdOn),
      status: statusLabel,
       };
     });
    }, [formatDate]);

  const fetchWorkflows = useCallback(async () => {
    const projectId = getProjectId();
    if (!projectId) {
      enqueueSnackbar("Please select a project first", { variant: "warning" });
      return;
    }

    try {
      setLoading(true);
      const response = await workflowService.getWorkflowList(projectId);
      const list = response?.responseData?.workflowList || [];
      setRawWorkflowList(list);
      setWorkflows(mapWorkflows(list));
      
      // Set trigger map from API response
      if (response?.responseData?.workflowTriggerMap) {
        workflowCommunicationService.setTriggerMap(response.responseData.workflowTriggerMap);
      }
    } catch (error) {
      setWorkflows([]);
      enqueueSnackbar("Failed to load workflows", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, mapWorkflows]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleSearch = useCallback(() => {
    if (gridApi) {
      gridApi.setQuickFilter(searchTerm);
    }
  }, [gridApi, searchTerm]);

  const handleAddWorkflow = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const handleEditWorkflow = useCallback(
    (workflowId: number) => {
      const rawWorkflow = rawWorkflowList.find((wf) => wf.id === workflowId);
      if (rawWorkflow) {
        // Map raw workflow data to WorkflowDetails format
        const workflowDetails: WorkflowDetails = {
          id: rawWorkflow.id,
          serialNo: rawWorkflow.serialNo,
          name: rawWorkflow.name,
          workflowDescription: rawWorkflow.workflowDescription,
          entityId: rawWorkflow.entityId,
          triggerId: rawWorkflow.triggerId,
          triggerFieldId: rawWorkflow.triggerFieldId,
          status: rawWorkflow.status,
          startDate: rawWorkflow.startDate,
          startTime: rawWorkflow.startTime,
          startAtAm: rawWorkflow.startAtAm,
          repeatOn: rawWorkflow.repeatOn,
          repeatFrequency: rawWorkflow.repeatFrequency,
          endDate: rawWorkflow.endDate,
          endTime: rawWorkflow.endTime,
          endAtAm: rawWorkflow.endAtAm,
          repeatedOn: rawWorkflow.repeatedOn,
        };
        setEditingWorkflow(workflowDetails);
        setIsEditModalOpen(true);
      } else {
        enqueueSnackbar("Workflow not found", { variant: "warning" });
      }
    },
    [enqueueSnackbar, rawWorkflowList]
  );

  const handleOpenWorkflow = useCallback(
    (workflowId: number) => {
      router.push("/workflows/details");
    },
    [router]
  );

  return (
    <Layout>
      <Head>
        <title>Workflows | 1Channel</title>
      </Head>

      <TailwindPageLayout
        header={
          <WorkflowsHeader
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onSearch={handleSearch}
            onAdd={handleAddWorkflow}
          />
        }
      >
        <div className="h-full w-full overflow-auto">
          {loading ? (
            <Spinner size="medium" customLoadingName="Loading workflows..." />
          ) : (
            <WorkflowsDataGrid
              data={workflows}
              loading={loading}
              searchText={searchTerm}
              onGridReady={(api) => setGridApi(api)}
              onEdit={handleEditWorkflow}
              onOpen={handleOpenWorkflow}
              totalCount={workflows.length}
              currentCount={workflows.length}
            />
          )}
        </div>
      </TailwindPageLayout>

      <AddWorkflowModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        projectId={getProjectId() || 0}
        loading={saving}
        onSave={async (workflowData) => {
          try {
            setSaving(true);
            const res = await workflowService.createOrUpdateWorkflow(workflowData);
            
            // Check for error status code in response body
            if (res?.statusCode >= 400) {
              let errorMsg = 'Unable to add. Please try again.';
              const errorMsgResp: string = res?.message || '';
              if (errorMsgResp.match('412 PRECONDITION_FAILED "')) {
                errorMsg = errorMsgResp.replace('412 PRECONDITION_FAILED "', '').replace('"', '');
              }
              enqueueSnackbar(errorMsg, { variant: "error" });
              setSaving(false);
              return;
            }
            
            await fetchWorkflows();
            enqueueSnackbar("Workflow added successfully", { variant: "success" });
            setIsAddModalOpen(false);
          } catch (err: any) {
            let errorMsg = 'Unable to add. Please try again.';
            const errorMsgResp: string = err?.data?.message || err?.message || '';
            if (errorMsgResp.match('412 PRECONDITION_FAILED "')) {
              errorMsg = errorMsgResp.replace('412 PRECONDITION_FAILED "', '').replace('"', '');
            }
            enqueueSnackbar(errorMsg, { variant: "error" });
          } finally {
            setSaving(false);
          }
        }}
      />

      {editingWorkflow && (
        <EditWorkflowModal
          open={isEditModalOpen}
          initialData={editingWorkflow}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingWorkflow(null);
          }}
          loading={saving}
          onSave={async (workflowData) => {
            try {
              setSaving(true);
              const res = await workflowService.createOrUpdateWorkflow(workflowData);
              
              // Check for error status code in response body
              if (res?.statusCode >= 400) {
                enqueueSnackbar('Unable to update. Please try again.', { variant: "error" });
                setSaving(false);
                return;
              }
              
              await fetchWorkflows();
              enqueueSnackbar("Workflow Updated.", { variant: "success" });
              setIsEditModalOpen(false);
              setEditingWorkflow(null);
            } catch (err: any) {
              enqueueSnackbar('Unable to update. Please try again.', { variant: "error" });
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
    </Layout>
  );
};

export default Workflows;
