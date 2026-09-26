import io
import re
from zipfile import ZipFile, ZIP_DEFLATED
import pytest
from openpyxl import Workbook
from app.parsers.xlsx_parser import parse

@pytest.mark.parametrize('dimension', ['', '<dimension ref="A1"/>'])
def test_missing_or_incorrect_dimensions(tmp_path, dimension):
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(['Number', 'Name', 'Marks'])
    sheet.append([1, 'Student A', 92])
    sheet.append([2, None, 0])
    original = io.BytesIO()
    workbook.save(original)
    path = tmp_path / 'export.xlsx'
    with ZipFile(original) as source, ZipFile(path, 'w', ZIP_DEFLATED) as dest:
        for name in source.namelist():
            data = source.read(name)
            if name == 'xl/worksheets/sheet1.xml':
                data = re.sub(rb'<dimension[^>]*/>', dimension.encode(), data)
            dest.writestr(name, data)
    pages = parse(path)
    assert pages[0].tables[0].rows == [['Number', 'Name', 'Marks'], ['1', 'Student A', '92'], ['2', '', '0']]
    assert 'Student A' in pages[0].text
