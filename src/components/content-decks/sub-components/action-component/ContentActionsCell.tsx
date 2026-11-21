import React from "react";

interface ContentActionsCellProps {
  data: any;
  onDeskView?: (deskId: number) => void;
  onDeskEdit?: (deskId: number) => void;
}

import EditActionButton from "../../../common/buttons/action-button/EditActionButton";
import DownloadActionButton from "../../../common/buttons/action-button/DownloadActionButton";

interface ContentActionsCellProps {
  data: any;
  onDeckEdit?: (deskId: number) => void;
  onDownload?: (deskId: number) => void;
}

const ContentActionsCell: React.FC<ContentActionsCellProps> = ({ data, onDeckEdit, onDownload }) => {
  return (
    <div className="flex justify-center items-center w-full h-full">
      {onDeckEdit && (
        <EditActionButton id={data.id} onEdit={onDeckEdit} variant="new"/>
      )}
      {onDownload && (
        <DownloadActionButton id={data.id} onClick={onDownload} className="-ml-1"/>
      )}
    </div>
  );
};

export default ContentActionsCell;
