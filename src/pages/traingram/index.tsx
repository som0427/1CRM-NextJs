import React from "react";
import Layout from "@/components/layout/Layout";
import Head from "next/head";
import TailwindPageLayout from "@/components/layout/TailwindPageLayout";
import ContentDecksHeader from "@/components/content-decks/ContentDecksHeader";
import Spinner from "@/components/common/Spinner";
import ContentDeckDataGrid from "@/components/content-decks/ContentDeckDataGrid";

import NoRecordsFound from "@/components/common/NoRecordsFound";
import AddEditContentDeckModal from "@/components/content-decks/sub-components/addEditComponent/AddEditContentDeckModal";
import { useSnackbar } from "notistack";
import { getProjectId } from "@/lib/storage/sharedStorage";
import { format, isValid, parseISO } from "date-fns";


export default function ContentDecksPage() {

  const [editDeckId, setEditDeckId] = React.useState<number | null>(null);

  const [decks, setDecks] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [addEditModalOpen, setAddEditModalOpen] = React.useState(false);
  const pageHeading = "Traingram";
  const projectId = getProjectId() || 0;

  const handleOpenAddModal = () => setAddEditModalOpen(true);
  
  const { enqueueSnackbar } = useSnackbar();

  const handleOpenEditModal = (id: number) => {
    setEditDeckId(id);
    setAddEditModalOpen(true);
  };

  // Fetch decks from API
  const fetchDecks = React.useCallback(async () => {
    setAddEditModalOpen(false);
    setEditDeckId(null);
    setLoading(true);
    try {
      // @ts-ignore
      const { fetchContentDecks } = await import("@/lib/api/contentDeckApi");
      
      const data = await fetchContentDecks(projectId);
      const transformedData = data.map((deck: any) => ({
        ...deck,
        id: deck.deckId ,
        status: deck.status == 1 ? "Active" : "Inactive",
        dueBy: formatDueDate(deck.dueBy),
      }));
      setDecks(transformedData);
    } catch (e) {
      setDecks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const formatDueDate = (dueBy) => {
    if (
      !dueBy ||
      dueBy === 'NA' ||
      dueBy.includes('Day') ||
      dueBy.includes('+')
    ) {
      return dueBy; // Return as-is
    }

    const parsedDate = parseISO(dueBy);

    if (!isValid(parsedDate)) return dueBy;

    return format(parsedDate, 'dd MMM yyyy');
  };

  React.useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  return (
    <>
      <Layout>
        <Head>
          <title>{pageHeading} Management | 1Channel</title>
        </Head>
        <TailwindPageLayout
          header={
            <ContentDecksHeader
              pageHeading={pageHeading}
              handleOpenAddModal={handleOpenAddModal}
            />
          }
        >
          <div className="h-full w-full overflow-auto">
            {loading ? (
              <Spinner />
            ) : decks.length === 0 ? (
              <NoRecordsFound heading={pageHeading} />
            ) : (
              <ContentDeckDataGrid 
                data={decks} 
                loading={loading} 
                onEditDeck={handleOpenEditModal} 
              />
            )}
          </div>

        </TailwindPageLayout>
      </Layout>
      
      {/* Render modals at root level to avoid z-index issues */}
      <AddEditContentDeckModal 
        open={addEditModalOpen} 
        onClose={() => {
          setAddEditModalOpen(false);
          setEditDeckId(null);
        }} 
        onSuccess={() => {
          enqueueSnackbar(`Traingram ${editDeckId ? 'updated' : 'added'} successfully`, { variant: 'success' ,autoHideDuration: 3000});
          fetchDecks();
        }} 
        deckId={editDeckId || undefined} 
      />
    </>
  );
}
