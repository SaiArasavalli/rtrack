"""
Streamlit app to view database tables from rtrack.db
Run with: streamlit run db_viewer.py
"""

import streamlit as st
import pandas as pd
import sqlite3
from pathlib import Path
from datetime import datetime

# Page config
st.set_page_config(
    page_title="rTrack Database Viewer",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Database path
DB_PATH = Path(__file__).parent / "rtrack.db"

# Table names mapping
TABLE_NAMES = {
    "employee": "Employee",
    "attendance": "Attendance",
    "weeklycompliance": "Weekly Compliance",
    "monthlycompliance": "Monthly Compliance",
    "quarterlycompliance": "Quarterly Compliance",
    "exception": "Exception"
}

def get_connection():
    """Get database connection."""
    return sqlite3.connect(str(DB_PATH))

def get_table_names():
    """Get all table names from the database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()
    return tables

def get_table_data(table_name, limit=None, offset=0):
    """Get data from a table."""
    conn = get_connection()
    query = f"SELECT * FROM {table_name}"
    if limit:
        query += f" LIMIT {limit} OFFSET {offset}"
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df

def get_table_count(table_name):
    """Get total row count for a table."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    count = cursor.fetchone()[0]
    conn.close()
    return count

def get_table_schema(table_name):
    """Get table schema information."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table_name})")
    schema = cursor.fetchall()
    conn.close()
    return schema

# Main app
st.title("📊 rTrack Database Viewer")
st.markdown("View and explore data from the rTrack database")

# Check if database exists
if not DB_PATH.exists():
    st.error(f"Database file not found at: {DB_PATH}")
    st.stop()

# Sidebar
with st.sidebar:
    st.header("Navigation")
    
    # Get all tables
    try:
        tables = get_table_names()
        if not tables:
            st.warning("No tables found in the database")
            st.stop()
    except Exception as e:
        st.error(f"Error connecting to database: {str(e)}")
        st.stop()
    
    # Table selector
    selected_table = st.selectbox(
        "Select Table",
        options=tables,
        format_func=lambda x: TABLE_NAMES.get(x.lower(), x.title())
    )
    
    st.divider()
    
    # Table info
    try:
        count = get_table_count(selected_table)
        st.metric("Total Records", f"{count:,}")
    except Exception as e:
        st.error(f"Error getting count: {str(e)}")
        count = 0
    
    st.divider()
    
    # Display options
    st.subheader("Display Options")
    show_schema = st.checkbox("Show Table Schema", value=False)
    show_stats = st.checkbox("Show Statistics", value=True)
    
    # Pagination
    st.subheader("Pagination")
    records_per_page = st.selectbox(
        "Records per page",
        options=[50, 100, 200, 500, 1000, "All"],
        index=1
    )
    
    if records_per_page != "All":
        total_pages = (count + records_per_page - 1) // records_per_page if count > 0 else 1
        page = st.number_input(
            "Page",
            min_value=1,
            max_value=max(1, total_pages),
            value=1,
            step=1
        )
        offset = (page - 1) * records_per_page
    else:
        page = 1
        total_pages = 1
        offset = 0
        records_per_page = None

# Main content area
try:
    # Get table data
    df = get_table_data(selected_table, limit=records_per_page, offset=offset)
    
    if df.empty:
        st.info(f"No data found in {TABLE_NAMES.get(selected_table.lower(), selected_table)} table")
    else:
        # Display table schema if requested
        if show_schema:
            with st.expander("📋 Table Schema", expanded=False):
                schema = get_table_schema(selected_table)
                schema_df = pd.DataFrame(
                    schema,
                    columns=["Column ID", "Column Name", "Data Type", "Not Null", "Default Value", "Primary Key"]
                )
                st.dataframe(schema_df, use_container_width=True, hide_index=True)
        
        # Display statistics if requested
        if show_stats and not df.empty:
            with st.expander("📈 Statistics", expanded=False):
                col1, col2, col3, col4 = st.columns(4)
                with col1:
                    st.metric("Total Rows", len(df))
                with col2:
                    st.metric("Total Columns", len(df.columns))
                with col3:
                    numeric_cols = len(df.select_dtypes(include=['number']).columns)
                    st.metric("Numeric Columns", numeric_cols)
                with col4:
                    null_count = df.isnull().sum().sum()
                    st.metric("Null Values", null_count)
                
                # Column statistics
                if numeric_cols > 0:
                    st.subheader("Numeric Column Statistics")
                    st.dataframe(df.describe(), use_container_width=True)
        
        # Search and filter
        st.subheader(f"📋 {TABLE_NAMES.get(selected_table.lower(), selected_table.title())} Data")
        
        # Search functionality
        search_cols = st.columns([3, 1])
        with search_cols[0]:
            search_term = st.text_input("🔍 Search", placeholder="Search across all columns...")
        with search_cols[1]:
            st.write("")  # Spacing
            st.write("")  # Spacing
        
        # Filter dataframe based on search
        if search_term:
            mask = df.astype(str).apply(
                lambda x: x.str.contains(search_term, case=False, na=False)
            ).any(axis=1)
            df_filtered = df[mask]
            if df_filtered.empty:
                st.warning(f"No records found matching '{search_term}'")
            else:
                st.info(f"Found {len(df_filtered)} record(s) matching '{search_term}'")
                df = df_filtered
        
        # Display pagination info
        if records_per_page and records_per_page != "All":
            start_record = offset + 1
            end_record = min(offset + records_per_page, count)
            st.caption(f"Showing records {start_record:,} to {end_record:,} of {count:,} total records")
        
        # Display data
        st.dataframe(
            df,
            use_container_width=True,
            height=600
        )
        
        # Download button
        csv = df.to_csv(index=False)
        st.download_button(
            label="📥 Download as CSV",
            data=csv,
            file_name=f"{selected_table}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv"
        )
        
        # Column info
        with st.expander("ℹ️ Column Information", expanded=False):
            col_info = []
            for col in df.columns:
                col_info.append({
                    "Column": col,
                    "Data Type": str(df[col].dtype),
                    "Non-Null Count": df[col].notna().sum(),
                    "Null Count": df[col].isna().sum(),
                    "Unique Values": df[col].nunique()
                })
            col_df = pd.DataFrame(col_info)
            st.dataframe(col_df, use_container_width=True, hide_index=True)

except Exception as e:
    st.error(f"Error loading table data: {str(e)}")
    st.exception(e)

# Footer
st.divider()
st.caption(f"Database: {DB_PATH} | Last updated: {datetime.fromtimestamp(DB_PATH.stat().st_mtime).strftime('%Y-%m-%d %H:%M:%S')}")

