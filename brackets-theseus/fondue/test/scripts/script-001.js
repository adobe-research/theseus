function foo(a) {
	bar(a + 1);
}
function bar(b) {
}
foo(1);
setTimeout(function () { bar(3); }, 100)
