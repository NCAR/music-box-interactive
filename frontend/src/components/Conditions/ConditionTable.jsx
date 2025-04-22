import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  TablePagination,
  TableSortLabel,
  Toolbar,
  Typography,
  Checkbox,
  IconButton,
  Tooltip,
  TextField,
  Button,
  Grid,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { alpha } from "@mui/material/styles";
import { removeConditions, addCondition } from "../../redux/actions";
import theme from "../../theme";
import AddIcon from "@mui/icons-material/Add";

function descendingComparator(a, b, orderBy) {
  const aValue = parseFloat(a[orderBy]);
  const bValue = parseFloat(b[orderBy]);

  if (!isNaN(aValue) && !isNaN(bValue)) {
    return bValue - aValue;
  }

  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator(order, orderBy) {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function EnhancedTableHead(props) {
  const {
    order,
    orderBy,
    onRequestSort,
    onSelectAllClick,
    numSelected,
    rowCount,
  } = props;
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        {props.schema.allowAddRemove ? (
          <TableCell padding="checkbox">
            <Checkbox
              color="primary"
              indeterminate={numSelected > 0 && numSelected < rowCount}
              checked={rowCount > 0 && numSelected === rowCount}
              onChange={onSelectAllClick}
            />
          </TableCell>
        ) : (
          <TableCell padding="checkbox" />
        )}
        <TableCell>
          <TableSortLabel
            active={orderBy === "name"}
            direction={orderBy === "name" ? order : "asc"}
            onClick={createSortHandler("name")}
          >
            Name
          </TableSortLabel>
        </TableCell>
        {props?.extraColumns?.map((item, index) => (
          <TableCell key={`${index}${item.key}`}>{item.label}</TableCell>
        ))}
        <TableCell>
          <TableSortLabel
            active={orderBy === "value"}
            direction={orderBy === "value" ? order : "asc"}
            onClick={createSortHandler("value")}
          >
            Initial value
          </TableSortLabel>
        </TableCell>
        <TableCell>
          <TableSortLabel
            active={orderBy === "units"}
            direction={orderBy === "units" ? order : "asc"}
            onClick={createSortHandler("units")}
          >
            Units
          </TableSortLabel>
        </TableCell>
      </TableRow>
    </TableHead>
  );
}

function EnhancedTableToolbar(props) {
  let { numSelected, onDelete, title } = props;
  let variant = "h6";

  if (numSelected > 0) {
    title = `${numSelected} selected`;
    variant = "subtitle1";
  }

  return (
    <Toolbar
      sx={{
        pl: { sm: 2 },
        pr: { xs: 1, sm: 1 },
        ...(numSelected > 0 && {
          bgcolor: (theme) =>
            alpha(
              theme.palette.primary.main,
              theme.palette.action.activatedOpacity,
            ),
        }),
      }}
    >
      <Typography sx={{ flex: "1 1 100%" }} variant={variant} component="div">
        {title}
      </Typography>

      {numSelected > 0 ? (
        <Tooltip title="Delete">
          <IconButton onClick={onDelete}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      ) : null}
    </Toolbar>
  );
}

const ConditionTable = (props) => {
  const unsetNames = props.data.filter((row) => !row.name).length;
  const [rows, setRows] = useState(props.data);
  const [selected, setSelected] = useState([]);
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("name");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchText, setSearchText] = useState("");

  // watch for changes so that the table updates whenever the redux store updates
  useEffect(() => {
    setRows(props.data);
    const maxPage = Math.max(0, Math.ceil(props.data.length / rowsPerPage) - 1);
    setPage(Math.min(page, maxPage));
  }, [props.data]);

  const applySortFilterPaging = (rows) => {
    return rows
      .filter((row) => {
        let result =
          row.name.toLowerCase().includes(searchText.toLowerCase()) ||
          row.units.toLowerCase().includes(searchText.toLowerCase());

        if (props.schema.extraColumns) {
          props.schema.extraColumns.forEach((item) => {
            result =
              result ||
              row[item.key].toLowerCase().includes(searchText.toLowerCase());
          });
        }

        return result;
      })
      .sort(getComparator(order, orderBy))
      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  };

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = sortedAndFilteredRows.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, id];
    } else {
      newSelected = selected.filter((item) => item !== id);
    }

    setSelected(newSelected.sort());
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleNameChange = (event, id) => {
    const newName = event.target.value;
    const newRow = rows.find((row) => row.id === id);
    if (props.nameIdMap) {
      // when it's a user defined reaction rate, we only update the reactionId, not the name
      // the name is constructed for us in the redux store selector so even if we set it here,
      // it will be overwritten if we get out of the store from the selector
      // we also need to set the suffix to uniquely identify the name, because of surface reaction
      newRow.reactionId = props.nameIdMap[newName].reactionId;
      newRow.suffix = props.nameIdMap[newName].suffix;
      newRow.type = props.nameIdMap[newName].type;
    } else {
      // for non user defined reaction rate conditions, all we need to do is update the name
      newRow.name = newName;
    }
    handleUpdate(newRow);
  };

  const handleUnitsChange = (event, id) => {
    const newunits = event.target.value;
    const newRow = rows.find((row) => row.id === id);
    newRow.units = newunits;
    handleUpdate(newRow);
  };

  const handleInitialValueChange = (event, id) => {
    const newValue = event.target.value;
    const newRow = rows.find((row) => row.id === id);
    newRow.value = newValue;
    handleUpdate(newRow);
  };

  const handleUpdate = (condition) => {
    props.addCondition({
      schema: props.schema,
      condition: {
        ...condition,
      },
    });
  };

  const handleAddCondition = () => {
    props.addCondition({
      schema: props.schema,
    });
  };

  const handleRemoveCondition = () => {
    props.removeConditions({
      schema: props.schema,
      conditionIds: selected,
    });
    setSelected([]);
  };

  const handleSearchChange = (event) => {
    setSearchText(event.target.value);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  const sortedAndFilteredRows = applySortFilterPaging(rows);

  return (
    <Paper
      elevation={3}
      sx={{
        width: "100%",
        overflow: "hidden",
        padding: `1%`,
        backgroundColor: theme.palette.background.white,
      }}
    >
      <EnhancedTableToolbar
        numSelected={selected.length}
        onDelete={handleRemoveCondition}
        title={props.title}
      />
      <Grid container spacing={8} alignItems="center">
        <Grid item xs={7}>
          <TextField
            variant="outlined"
            margin="normal"
            fullWidth
            label="Search"
            value={searchText}
            onChange={handleSearchChange}
          />
        </Grid>
        <Grid item xs={4}>
          {" "}
        </Grid>
        {props.schema.allowAddRemove &&
        props.availableNames.length - unsetNames > 0 ? (
          <Grid item xs={1}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleAddCondition}
              onKeyDown={handleAddCondition}
              fullWidth
            >
              <AddIcon />
            </Button>
          </Grid>
        ) : null}
      </Grid>
      <TableContainer sx={{ maxHeight: 440 }} component={Paper}>
        <Table stickyHeader size="small">
          <EnhancedTableHead
            extraColumns={props.schema.extraColumns}
            numSelected={selected.length}
            order={order}
            orderBy={orderBy}
            onSelectAllClick={handleSelectAllClick}
            onRequestSort={handleRequestSort}
            rowCount={sortedAndFilteredRows.length}
            schema={props.schema}
          />
          <TableBody>
            {sortedAndFilteredRows.map((row, index) => {
              const isItemSelected = isSelected(row.id);
              const labelId = `enhanced-table-checkbox-${index}`;

              return (
                <TableRow
                  hover
                  role="checkbox"
                  aria-checked={isItemSelected}
                  tabIndex={-1}
                  key={row.id}
                  selected={isItemSelected}
                >
                  {props.schema.allowAddRemove ? (
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        onClick={(event) => handleClick(event, row.id)}
                        checked={isItemSelected}
                        inputProps={{
                          "aria-labelledby": labelId,
                        }}
                      />
                    </TableCell>
                  ) : (
                    <TableCell padding="checkbox" />
                  )}

                  <TableCell component="th" id={labelId} scope="row">
                    {row.name ? (
                      row.name
                    ) : (
                      <FormControl fullWidth>
                        <Select
                          variant="standard"
                          value={row.name}
                          onChange={(event) => handleNameChange(event, row.id)}
                        >
                          {props.availableNames.map((name, index) => (
                            <MenuItem key={`${index}name`} value={name}>
                              {name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </TableCell>
                  {props.schema?.extraColumns?.map((item, index) => (
                    <TableCell key={`${index}${item.key}`}>
                      {row[item.key]}
                    </TableCell>
                  ))}
                  <TableCell>
                    <TextField
                      variant="standard"
                      value={row.value}
                      onChange={(event) =>
                        handleInitialValueChange(event, row.id)
                      }
                      type="number"
                    />
                  </TableCell>
                  <TableCell style={{ width: "250px" }}>
                    <FormControl fullWidth>
                      <Select
                        variant="standard"
                        value={row.units}
                        onChange={(event) => handleUnitsChange(event, row.id)}
                      >
                        {props.getUnits(row).map((units, index) => (
                          <MenuItem key={`${index}units`} value={units}>
                            {units}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50, 100]}
        component="div"
        count={rows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default connect(null, { removeConditions, addCondition })(
  ConditionTable,
);
