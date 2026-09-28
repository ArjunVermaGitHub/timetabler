'use client';

import React, { useState, useEffect, Suspense } from 'react'
import Table from './Table';
import Loader from '../Loader';
import Button from '../Button';
import IconProvider from '../IconProvider';
import TableFilter from './TableFilter';
import './TablePage.scss'
import tableUtils from './Table/tableUtils';

function TablePage({
    beFiltering = false,
    tableTitle,
    columns,
    customAction,
    customJSX,
    fetchFunction,
    pageButtons,
    currencyBtn,
    name,
    filterProps,
    initialData = [],
    mockData = false,
    /**
     * External "data is still loading" signal (e.g. React Query's `isLoading`).
     * Keeps the in-table loader visible until the data arrives, so consumers
     * driving `initialData` from a cache don't flash an empty/"no records"
     * state before the first fetch completes.
     */
    loading = false,
    ...tableProps
}) {

    const [showLoader, setShowLoader] = useState(true);
    const [open, setOpen] = useState(false)
    const [data, setData] = useState(initialData);
    const [reset, setReset] = useState(false)
    const defaultParams = {
        sort: '',
        skip: 0,
        page:1,
        limit: 10,
        total: 0,
        filter: '',
        search: ''
    }
    const [filterCount, setFilterCount] = useState(0);
    const [tableParams, setTableParams] = useState(defaultParams)

    const setStateData = (res) => {
        const responseData = res?.data || res || [];
        setData(responseData);
        setTableParams({ ...tableParams, total: res?.count || responseData?.length });     
        setTimeout(() => setShowLoader(false), 100);
    };
    
    useEffect(() => {
        if (mockData) {
            setData([]);
            setShowLoader(false);
            return;
        }
        if (fetchFunction) {
            fetchFunction({ ...tableParams, limit: (!beFiltering ? 1000 : tableParams.limit),  filters: tableParams.filter })?.then(setStateData).catch(err => {
                console.error(err)
                setTimeout(() => setShowLoader(false), 100)
                setData([])
            })
        } else if (initialData && initialData.length > 0) {
            setData(initialData);
            setTableParams({ ...tableParams, total: initialData.length });
            setTimeout(() => setShowLoader(false), 100);
        } else {
            setTimeout(() => setShowLoader(false), 100)
        }
    }, [mockData])

    useEffect(() => {
        if (reset) {
            setTableParams(defaultParams)
            if (mockData) return
            if (fetchFunction) {
                fetchFunction({ ...defaultParams, limit: (!beFiltering ? 1000 : tableParams.limit), filters: defaultParams.filter})?.then(setStateData).catch(err => {
                    setTimeout(() => setShowLoader(false), 100)
                    setData([])
                })
            }
        }
    }, [reset, mockData])

    // Sync external data (e.g. React Query cache) into the table whenever
    // `initialData` changes and no `fetchFunction` owns the fetch. Must cover
    // the "list shrinks to empty" case so a delete that empties the table
    // actually clears the rendered rows.
    useEffect(() => {
        if (mockData) return
        if (fetchFunction) return
        const next = Array.isArray(initialData) ? initialData : [];
        setData(next);
        setTableParams(prev => ({ ...prev, total: next.length }));
    }, [initialData, mockData, fetchFunction])

    const showDrawer = () => {
        setOpen(true)
    }

    return (
        showLoader ?
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Loader size="medium" />
            </div>
            :
            <>
                <Suspense fallback={<Loader size="medium" />}>
                    <Table
                        currencyBtn={currencyBtn}
                        className={'SampleTable'}
                        beFiltering={beFiltering}
                        data={data}
                        fetchFunction={fetchFunction}
                        mockData={mockData}
                        loading={loading}
                        item={"Entry"}
                        menuButtons={
                            filterProps && (
                                <Button variant="secondary" onClick={showDrawer} className="table-page-filter-btn">
                                    <IconProvider name="filter" size={16} />
                                    <span>Filter</span>
                                    {filterCount > 0 ? (
                                        <span className="table-page-filter-count">{filterCount}</span>
                                    ) : null}
                                </Button>
                            )
                        }
                        name={name}
                        pageButtons={pageButtons}
                        selectable={false}
                        serialize={false}
                        setData={setData}
                        sorting
                        tableColumns={columns}
                        title={tableTitle}
                        tableParams={tableParams}
                        setTableParams={setTableParams}
                        customJSX={customJSX}
                        {...tableProps}
                    />
                </Suspense>
                {filterProps && (
                    <TableFilter
                        fetchFunction={fetchFunction}
                        filterProps={filterProps}
                        name={name}
                        onClose={() => setOpen(false)}
                        open={open}
                        setData={setData}
                        setOpen={setOpen}
                        setShowLoader={setShowLoader}
                        beFiltering={beFiltering}
                        tableParams={tableParams}
                        setTableParams={setTableParams}
                        setFilterCount={setFilterCount}
                        moduleType={tableProps.moduleType}
                    />
                )}
            </>
    )
}
export default TablePage;